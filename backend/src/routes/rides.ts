import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { fareQuote, clampOffer } from '../utils/fare';
import { normalizeUgPhone } from '../utils/uganda';

const router = express.Router();

// ─── Fare Quotation ──────────────────────────────────────
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { type, km, min } = req.query;
    if (!type || !km) return res.status(400).json({ message: 'Ride type and distance are required' });

    const fare = fareQuote(type as string, parseFloat(km as string), parseFloat(min as string || '0'));
    res.json({ ok: true, fare });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating quote' });
  }
});

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
      receiverPhone,
      fareOffered,
    } = req.body;

    const userId = req.user?.userId;
    const db = getDB();

    if (!pickup || !destination || !rideType) {
      return res.status(400).json({ message: 'Missing required ride details.' });
    }

    // Professional Fare Calculation
    const fareRecommended = fareQuote(rideType, distanceKm || 0, durationMin || 0);
    const finalFareOffered = clampOffer(rideType, distanceKm || 0, durationMin || 0, fareOffered || fareRecommended);

    // Server-side balance validation for wallet payments
    if (paymentMethod === 'wallet') {
      const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);
      if (!wallet || wallet.balance < fareRecommended) {
        return res.status(400).json({ message: 'Insufficient wallet balance for this ride.' });
      }
    }

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
        finalFareOffered, // Use clamped rider's offer if provided, else recommended
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

// ─── Get Ride Details ──────────────────────────────────────
router.get('/details/:rideId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.user?.userId;
    const db = getDB();

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Security check: only the rider or the assigned driver can view ride details
    if (ride.userId !== userId && ride.driverId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You are not part of this ride' });
    }

    const rider = await db.get(
      `SELECT u.id, u.fullName, u.phone, u.verificationStatus,
              COALESCE(dp.rating, 5) AS rating,
              COALESCE(dp.totalTrips, 0) AS totalTrips
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.userId = u.id
       WHERE u.id = ?`,
      [ride.userId]
    );

    res.json({
      ...ride,
      rider: rider,
      pickup: { address: ride.pickupName, lat: ride.pickupLat, lng: ride.pickupLng },
      destination: { address: ride.dropName, lat: ride.dropLat, lng: ride.dropLng }
    });
  } catch (error) {
    console.error('Ride details error:', error);
    res.status(500).json({ message: 'Error fetching ride details' });
  }
});

// ─── Get Recent Trips (for Home Screen) ────────────────────────────────
router.get('/recent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const db = getDB();

    const recentRides = await db.all(
      'SELECT * FROM rides WHERE userId = ? AND status = ? ORDER BY requestedAt DESC LIMIT 3',
      [userId, 'completed']
    );

    const formatted = recentRides.map(ride => ({
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

    res.json(formatted);
  } catch (error) {
    console.error('Recent rides error:', error);
    res.status(500).json({ message: 'Error fetching recent trips.' });
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
