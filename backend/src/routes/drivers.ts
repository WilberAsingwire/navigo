import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { COMMISSION_RATE, driverShare } from '../utils/fare';

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
    res.json({ ok: true, lat, lng });
  } catch (error) {
    console.error('Driver location error:', error);
    res.status(500).json({ message: 'Failed to update driver location.' });
  }
});

// ─── Toggle Online Status ─────────────────────────────
router.post('/status/online', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const { online } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (typeof online !== 'boolean') {
      return res.status(400).json({ message: 'online must be a boolean' });
    }

    // Update both users and driver_profiles for consistency
    await db.run('UPDATE users SET isOnline = ? WHERE id = ?', [online, userId]);
    await db.run('UPDATE driver_profiles SET online = ? WHERE userId = ?', [online, userId]);

    res.json({ message: `You are now ${online ? 'online' : 'offline'}`, isOnline: online });
  } catch (error) {
    console.error('Online status error:', error);
    res.status(500).json({ message: 'Error updating online status' });
  }
});

// ─── Toggle Availability ─────────────────────────────
router.post('/status/available', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const { available } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (typeof available !== 'boolean') {
      return res.status(400).json({ message: 'available must be a boolean' });
    }

    await db.run('UPDATE users SET isAvailable = ? WHERE id = ?', [available, userId]);

    res.json({ message: `You are now ${available ? 'available' : 'unavailable'}`, isAvailable: available });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ message: 'Error updating availability status' });
  }
});

// ─── Get Driver Profile ───────────────────────────────
router.get('/profile', authenticate, authorize(['driver', 'motorist']), async (req: any, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

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
