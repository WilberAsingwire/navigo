import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Toggle Online Status ─────────────────────────────
router.post('/status/online', authenticate, async (req: any, res: Response) => {
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
router.post('/status/available', authenticate, async (req: any, res: Response) => {
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
router.get('/profile', authenticate, async (req: any, res: Response) => {
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
router.get('/stats', authenticate, async (req: any, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    // Total earnings and completed rides
    const totals = await db.get(
      'SELECT SUM(fareFinal) as totalEarnings, COUNT(*) as completedCount FROM rides WHERE driverId = ? AND status = \'completed\'',
      [userId]
    );

    // Today's earnings
    const today = await db.get(
      'SELECT SUM(fareFinal) as todayEarnings FROM rides WHERE driverId = ? AND status = \'completed\' AND requestedAt >= CURRENT_DATE',
      [userId]
    );

    // Weekly earnings
    const weekly = await db.get(
      'SELECT SUM(fareFinal) as weeklyEarnings FROM rides WHERE driverId = ? AND status = \'completed\' AND requestedAt >= CURRENT_DATE - INTERVAL \'7 days\'',
      [userId]
    );

    // Acceptance rate: completed / (completed + cancelled_by_driver)
    const accepted = await db.get(
      'SELECT COUNT(*) as count FROM rides WHERE driverId = ? AND status IN (\'completed\', \'cancelled\')',
      [userId]
    );
    const completed = await db.get(
      'SELECT COUNT(*) as count FROM rides WHERE driverId = ? AND status = \'completed\'',
      [userId]
    );
    const acceptanceRate = accepted.count > 0 ? Math.round((completed.count / accepted.count) * 100) : 100;

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
        acceptanceRate: acceptanceRate,
        rating: (await db.get('SELECT rating FROM driver_profiles WHERE userId = ?', [userId]))?.rating || 5
      },
      activity: activity.map((r: any) => ({
        id: r.id,
        text: r.status === 'completed' ? `Ride completed to ${r.dropName} — UGX ${r.fareFinal.toLocaleString()}` : `Ride ${r.status} to ${r.dropName}`,
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
