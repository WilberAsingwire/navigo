import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { COMMISSION_RATE, driverShare } from '../utils/fare';
import { notifyAdminLocation } from '../socket/socketHandler';
import { canReceiveBookings, syncDriverAvailability } from '../utils/driverAvailability';

const router = express.Router();

// ─── Nearby online drivers (for the rider's map) ──────────────────────────
// Returns approved drivers currently online within ~8 km of the given point.
// PRIVACY: coordinates are rounded to ~110 m and only id/type/position are
// exposed — never names, phones, or exact locations of drivers at rest.
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

router.get('/nearby', authenticate, async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(String(req.query.lat));
    const lng = parseFloat(String(req.query.lng));
    if (isNaN(lat) || isNaN(lng) || lat < -2 || lat > 5 || lng < 29 || lng > 36) {
      return res.status(400).json({ ok: false, message: 'Valid lat/lng within Uganda required.' });
    }
    const db = getDB();
    const rows = await db.all(
      `SELECT u.id, COALESCE(dp.vehicleType, u.vehicleType) AS vehicleType,
              COALESCE(dp.lat, u.currentLat) AS lat, COALESCE(dp.lng, u.currentLng) AS lng
       FROM users u LEFT JOIN driver_profiles dp ON dp.userId = u.id
       WHERE (u.role = 'driver' OR u.role = 'motorist') AND u.isOnline = TRUE AND u.isAvailable = TRUE
         AND u.verificationStatus = 'approved'
         AND COALESCE(u.status, 'active') = 'active'
         AND u.lastLocationAt IS NOT NULL
         AND u.lastLocationAt >= CURRENT_TIMESTAMP - INTERVAL '90 seconds'
       LIMIT 200`,
      []
    );
    const drivers = (rows || [])
      .filter((d: any) => d.lat != null && d.lng != null)
      .map((d: any) => ({ ...d, distKm: haversineKm(lat, lng, Number(d.lat), Number(d.lng)) }))
      .filter((d: any) => d.distKm <= 8)
      .sort((a: any, b: any) => a.distKm - b.distKm)
      .slice(0, 20)
      .map((d: any) => ({
        id: d.id,
        type: String(d.vehicleType || 'go').toLowerCase(),
        lat: Math.round(Number(d.lat) * 1000) / 1000, // ~110 m fuzzing
        lng: Math.round(Number(d.lng) * 1000) / 1000,
      }));
    res.json({ ok: true, drivers });
  } catch (error) {
    console.error('Nearby drivers error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch nearby drivers' });
  }
});

// SQL expression for the driver's take-home on a ride (fare minus commission).
// COMMISSION_RATE is a server-side constant (clamped 0.05–0.2 in fare.ts), not user input.
const DRIVER_SHARE_SQL = `(fareFinal - ROUND(fareFinal * ${COMMISSION_RATE}))`;

// ─── Update driver's current location (online/live map) ─────────────
router.post('/location', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const userId = (req as AuthRequest).user?.userId;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -5 || lat > 5 || lng < 29 || lng > 36) {
      return res.status(400).json({ message: 'Valid Uganda latitude and longitude are required.' });
    }
    const db = getDB();
    await db.run(
      'UPDATE users SET currentLat = ?, currentLng = ?, lastLocationAt = CURRENT_TIMESTAMP WHERE id = ?',
      [lat, lng, userId]
    );
    await db.run(
      'UPDATE driver_profiles SET lat = ?, lng = ? WHERE userId = ?',
      [lat, lng, userId]
    );
    notifyAdminLocation(String(userId), lat, lng);
    res.json({ ok: true, lat, lng });
  } catch (error) {
    console.error('Driver location error:', error);
    res.status(500).json({ message: 'Failed to update driver location.' });
  }
});

// ─── Toggle Online Status ─────────────────────────────
router.post('/status/online', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  const { online } = req.body;
  const userId = (req as AuthRequest).user?.userId;
  const db = getDB();

  if (typeof online !== 'boolean') {
    return res.status(400).json({ message: 'online must be a boolean' });
  }

  const tx = await db.getTransactionClient();
  try {
    await tx.query('BEGIN');

    // Lock the driver row so going online/offline cannot race with ride acceptance.
    const driverResult = await tx.query(
      `SELECT verificationStatus, COALESCE(status, 'active') AS "accountStatus"
       FROM users
       WHERE id = ? AND role IN ('driver', 'motorist')
       FOR UPDATE`,
      [userId]
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      await tx.query('ROLLBACK');
      tx.release();
      return res.status(404).json({ message: 'Driver account not found.' });
    }

    if (online && !canReceiveBookings({ isOnline: true, verificationStatus: driver.verificationStatus, accountStatus: driver.accountStatus }, false)) {
      await tx.query('ROLLBACK');
      tx.release();
      return res.status(403).json({ message: 'Your account must be approved and active before you can go online.' });
    }

    const activeRideResult = await tx.query(
      `SELECT id FROM rides
       WHERE driverId = ? AND status IN ('accepted', 'arrived', 'ongoing')
       LIMIT 1`,
      [userId]
    );
    const isAvailable = online && activeRideResult.rows.length === 0;

    await tx.query(
      'UPDATE users SET isOnline = ?, isAvailable = ? WHERE id = ?',
      [online, isAvailable, userId]
    );
    await tx.query(
      'UPDATE driver_profiles SET online = ? WHERE userId = ?',
      [online, userId]
    );

    await tx.query('COMMIT');
    tx.release();

    res.json({
      message: `You are now ${online ? 'online' : 'offline'}`,
      isOnline: online,
      isAvailable,
    });
  } catch (error) {
    try { await tx.query('ROLLBACK'); } catch {}
    tx.release();
    console.error('Online status error:', error);
    res.status(500).json({ message: 'Error updating online status' });
  }
});

// ─── Toggle Availability ─────────────────────────────
router.post('/status/available', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  const { available } = req.body;
  const userId = (req as AuthRequest).user?.userId;
  const db = getDB();

  if (typeof available !== 'boolean') {
    return res.status(400).json({ message: 'available must be a boolean' });
  }

  const tx = await db.getTransactionClient();
  try {
    await tx.query('BEGIN');
    const driverResult = await tx.query(
      `SELECT isOnline, verificationStatus, COALESCE(status, 'active') AS "accountStatus"
       FROM users
       WHERE id = ? AND role IN ('driver', 'motorist')
       FOR UPDATE`,
      [userId]
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      await tx.query('ROLLBACK');
      tx.release();
      return res.status(404).json({ message: 'Driver account not found.' });
    }

    const activeRideResult = await tx.query(
      `SELECT id FROM rides
       WHERE driverId = ? AND status IN ('accepted', 'arrived', 'ongoing')
       LIMIT 1`,
      [userId]
    );
    const shouldBeAvailable = canReceiveBookings({
      isOnline: driver.isOnline,
      verificationStatus: driver.verificationStatus,
      accountStatus: driver.accountStatus,
    }, activeRideResult.rows.length > 0);

    if (available && !shouldBeAvailable) {
      await tx.query('ROLLBACK');
      tx.release();
      return res.status(409).json({ message: 'You must be online, approved and free of active rides before accepting bookings.' });
    }

    await tx.query('UPDATE users SET isAvailable = ? WHERE id = ?', [available && shouldBeAvailable, userId]);
    await tx.query('COMMIT');
    tx.release();

    res.json({
      message: `You are now ${available && shouldBeAvailable ? 'available' : 'unavailable'}`,
      isAvailable: available && shouldBeAvailable,
    });
  } catch (error) {
    try { await tx.query('ROLLBACK'); } catch {}
    tx.release();
    console.error('Availability error:', error);
    res.status(500).json({ message: 'Error updating availability status' });
  }
});

// ─── Get Driver Profile ───────────────────────────────
router.get('/profile', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    // Repair availability for existing accounts after deploying this lifecycle fix.
    await syncDriverAvailability(db, userId);
    const user = await db.get('SELECT id, fullName, phone, role, isOnline, isAvailable, verificationStatus FROM users WHERE id = ?', [userId]);
    const profile = await db.get('SELECT * FROM driver_profiles WHERE userId = ?', [userId]);

    if (!user) return res.status(404).json({ message: 'Driver not found' });

    res.json({
      user,
      profile: profile || { rating: 5, totalTrips: 0, online: false }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching driver profile' });
  }
});

// ─── Get Driver Stats & Activity ────────────────────────
router.get('/stats', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    // Total earnings (driver's 90% share, matching what settlement actually pays) and completed rides
    const totals = await db.get(
      `SELECT SUM(${DRIVER_SHARE_SQL}) as totalEarnings, COUNT(*) as completedCount FROM rides WHERE driverId = ? AND status = 'completed'`,
      [userId]
    );

    // Today's earnings
    const today = await db.get(
      `SELECT SUM(${DRIVER_SHARE_SQL}) as todayEarnings FROM rides WHERE driverId = ? AND status = 'completed' AND requestedAt >= CURRENT_DATE`,
      [userId]
    );

    // Weekly earnings
    const weekly = await db.get(
      `SELECT SUM(${DRIVER_SHARE_SQL}) as weeklyEarnings FROM rides WHERE driverId = ? AND status = 'completed' AND requestedAt >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    // We do not persist a per-driver "offered ride" history yet, so a true
    // acceptance rate cannot be calculated. Report the measurable completion
    // rate instead of presenting a misleading acceptance percentage.
    const assigned = await db.get(
      "SELECT COUNT(*) as count FROM rides WHERE driverId = ? AND status IN ('completed', 'cancelled')",
      [userId]
    );
    const completed = await db.get(
      "SELECT COUNT(*) as count FROM rides WHERE driverId = ? AND status = 'completed'",
      [userId]
    );
    const completionRate = Number(assigned.count) > 0
      ? Math.round((Number(completed.count) / Number(assigned.count)) * 100)
      : 100;

    // Recent activity (last 10 events)
    const activity = await db.all(
      'SELECT id, fareFinal, pickupName, dropName, status, requestedAt FROM rides WHERE driverId = ? ORDER BY requestedAt DESC LIMIT 10',
      [userId]
    );

    res.json({
      stats: {
        earnings: totals.totalEarnings || 0,
        todayEarnings: today.todayEarnings || 0,
        weeklyEarnings: weekly.weeklyEarnings || 0,
        completedRides: totals.completedCount || 0,
        completionRate,
        rating: (await db.get('SELECT rating FROM driver_profiles WHERE userId = ?', [userId]))?.rating || 5
      },
      activity: activity.map((r: any) => ({
        id: r.id,
        text: r.status === 'completed' ? `Ride completed to ${r.dropName} — UGX ${driverShare(Number(r.fareFinal) || 0).toLocaleString()} earned` : `Ride ${r.status} to ${r.dropName}`,
        time: r.requestedAt,
        icon: 'checkmarkCircleOutline',
        color: r.status === 'completed' ? '#2D6A4F' : '#4da6ff'
      }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching driver stats' });
  }
});

export default router;
