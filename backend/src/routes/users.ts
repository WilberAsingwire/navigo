import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Profile Update ────────────────────────────────────
router.put('/update', authenticate, async (req: Request, res: Response) => {
  try {
    const { fullName, email } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (email) {
      const existingEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase().trim(), userId]);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered to another account.' });
      }
    }

    await db.run(
      'UPDATE users SET fullName = ?, email = ? WHERE id = ?',
      [fullName.trim(), email ? email.toLowerCase().trim() : null, userId]
    );

    const updatedUser = await db.get('SELECT id, fullName, email, phone, role, city, vehicleType, isBot, phoneVerified, verificationStatus, driverDocs, rejectionReason, socialProvider, socialId, createdAt, isOnline, isAvailable FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile.' });
  }
});

// ─── Saved Places ──────────────────────────────────────
router.get('/saved-places/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (userId !== (req as AuthRequest).user?.userId) return res.status(403).json({ message: 'Unauthorized' });

    const db = getDB();
    const places = await db.all('SELECT * FROM saved_places WHERE userId = ?', [userId]);
    res.json(places);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saved places.' });
  }
});

router.post('/saved-places', authenticate, async (req: Request, res: Response) => {
  try {
    const { label, address, lat, lng } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (!label || !address || !lat || !lng) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const placeId = 'place_' + Date.now();
    await db.run(
      'INSERT INTO saved_places (id, userId, label, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [placeId, userId, label, address, lat, lng]
    );

    res.status(201).json({ message: 'Place saved successfully!', placeId });
  } catch (error) {
    res.status(500).json({ message: 'Error saving place.' });
  }
});

router.delete('/saved-places/:placeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    await db.run('DELETE FROM saved_places WHERE id = ? AND userId = ?', [placeId, userId]);
    res.json({ message: 'Place deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting place.' });
  }
});

export default router;
