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

    // Going online also makes the driver available for matching; going offline
    // always clears availability. (isAvailable is separately cleared the moment
    // a driver accepts a ride, and restored here the next time they go online,
    // or explicitly via /status/available once they finish a ride.)
    await db.run('UPDATE users SET isOnline = ?, isAvailable = ? WHERE id = ?', [online, online, userId]);
    await db.run('UPDATE driver_profiles SET online = ? WHERE userId = ?', [online, userId]);

    res.json({ message: `You are now ${online ? 'online' : 'offline'}`, isOnline: online, isAvailable: online });
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

// ─── Update Vehicle Details ────────────────────────────
router.put('/vehicle', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { model, plate, color, year } = req.body;
    const db = getDB();

    if (!model || !plate) {
      return res.status(400).json({ message: 'Model and plate number are required' });
    }

    await db.run(
      `INSERT INTO driver_profiles (userId, model, plate, color, year)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (userId) DO UPDATE SET model = EXCLUDED.model, plate = EXCLUDED.plate,
         color = EXCLUDED.color, year = EXCLUDED.year`,
      [userId, model, String(plate).toUpperCase(), color || null, year || null]
    );

    const profile = await db.get('SELECT * FROM driver_profiles WHERE userId = ?', [userId]);
    res.json({ message: 'Vehicle details updated successfully!', profile });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Failed to update vehicle details' });
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
