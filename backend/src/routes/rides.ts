import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { fareQuote } from '../utils/fare';
import { normalizeUgPhone } from '../utils/uganda';

const router = express.Router();

// ─── Request Ride/Delivery ───────────────────────────────────────
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      serviceType = 'ride',
      pickup,
      destination,
      rideType,
      paymentMethod,
      distanceKm,
      durationMin,
      packageDetails,
      receiverName,
      receiverPhone
    } = req.body;

    const userId = req.user?.userId;
    const db = getDB();

    if (!pickup || !destination || !rideType) {
      return res.status(400).json({ message: 'Missing required ride details.' });
    }

    // Professional Fare Calculation
    const fareRecommended = fareQuote(rideType, distanceKm || 0);

    const rideId = 'ride_' + Date.now();

    await db.run(
      `INSERT INTO rides (
        id, userId, serviceType, vehicleType, status, paymentMethod,
        pickupName, pickupLat, pickupLng,
        dropName, dropLat, dropLng,
        distanceKm, durationMin,
        fareRecommended, fareOffered, fareFinal,
        packageDetails, receiverName, receiverPhone,
        requestedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId,
        userId,
        serviceType,
        rideType,
        'requested',
        paymentMethod || 'cash',
        pickup.address, pickup.lat, pickup.lng,
        destination.address, destination.lat, destination.lng,
        distanceKm || 0,
        durationMin || 0,
        fareRecommended,
        fareRecommended, // Default offered is the recommended fare
        fareRecommended, // Initial final is the recommended fare
        packageDetails || null,
        receiverName || null,
        receiverPhone || null,
        new Date().toISOString()
      ]
    );

    res.json({
      message: serviceType === 'delivery' ? 'Delivery requested successfully!' : 'Ride requested successfully!',
      ride: {
        id: rideId,
        fareRecommended,
        status: 'requested'
      }
    });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ message: 'Failed to request booking.' });
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
      SELECT r.*, u.fullName as driverName, u.verificationStatus as driverRating
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

    // Format for frontend compatibility
    const formattedRides = rides.map(ride => ({
      ...ride,
      pickup: {
        address: ride.pickupName,
        lat: ride.pickupLat,
        lng: ride.pickupLng
      },
      destination: {
        address: ride.dropName,
        lat: ride.dropLat,
        lng: ride.dropLng
      }
    }));

    res.json(formattedRides);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Error fetching ride history.' });
  }
});

export default router;
