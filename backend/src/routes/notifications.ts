import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

const readDeviceToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (token.length < 20 || token.length > 4096) return null;
  return token;
};

// Register or refresh the FCM token for the authenticated account.
// The user ID is always taken from the verified JWT, never from the request body.
router.post('/register-device', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const token = readDeviceToken(req.body?.token);
    const platform = req.body?.platform;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!token) {
      return res.status(400).json({ message: 'A valid device token is required.' });
    }
    if (platform !== 'android' && platform !== 'ios') {
      return res.status(400).json({ message: 'Unsupported device platform.' });
    }

    const db = getDB();
    await db.run(
      `INSERT INTO device_tokens (id, userId, token, platform)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (token) DO UPDATE
       SET userId = EXCLUDED.userId,
           platform = EXCLUDED.platform,
           updatedAt = CURRENT_TIMESTAMP`,
      [randomUUID(), userId, token, platform]
    );

    return res.status(200).json({ message: 'This device is registered for NAVIGO notifications.' });
  } catch {
    return res.status(500).json({ message: 'Unable to register this device for notifications.' });
  }
});

// Remove only the matching token owned by the authenticated account.
router.delete('/unregister-device', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const token = readDeviceToken(req.body?.token);

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!token) {
      return res.status(400).json({ message: 'A valid device token is required.' });
    }

    const db = getDB();
    await db.run(
      'DELETE FROM device_tokens WHERE userId = ? AND token = ?',
      [userId, token]
    );

    return res.status(200).json({ message: 'Device notification registration removed.' });
  } catch {
    return res.status(500).json({ message: 'Unable to remove this device registration.' });
  }
});

export default router;
