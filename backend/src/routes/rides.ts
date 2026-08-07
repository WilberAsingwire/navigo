import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// ─── Request Ride ───────────────────────────────────────
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { pickup, destination, rideType, paymentMethod, fare } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    const rideId = 'ride_' + Date.now();
    await db.run(
      'INSERT INTO rides (id, pickup, destination, rideType, paymentMethod, fare, status, requestedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [rideId, JSON.stringify(pickup), JSON.stringify(destination), rideType, paymentMethod, fare, 'requested', new Date().toISOString()]
    );

    res.json({ message: 'Ride requested successfully!', ride: { id: rideId } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to request ride.' });
  }
});

// ─── Get Ride History ────────────────────────────────────
router.get('/history/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user?.userId) return res.status(403).json({ message: 'Unauthorized' });

    const db = getDB();
    const statusFilter = req.query.status as string;
    
    let query = `
      SELECT r.*, u.name as driverName, u.verificationStatus as driverRating
      FROM rides r
      LEFT JOIN users u ON r.driverId = u.id
      WHERE (r.userId = ? OR r.driverId = ?)
    `;
    const params: any[] = [userId, userId];

    if (statusFilter && statusFilter !== 'all') {
      query += ' AND status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY requestedAt DESC';
    
    const rides = await db.all(query, params);
    
    // Format for frontend
    const formattedRides = rides.map(ride => ({
      ...ride,
      pickup: JSON.parse(ride.pickup),
      destination: JSON.parse(ride.destination)
    }));

    res.json(formattedRides);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ride history.' });
  }
});

export default router;
