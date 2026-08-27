import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Toggle Online Status ─────────────────────────────
router.post('/status/online', authenticate, async (req: any, res: Response) => {
  try {
    const { online } = req.body;
    const userId = req.user?.userId;
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
    const userId = req.user?.userId;
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
    const userId = req.user?.userId;
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

export default router;
