import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { fareQuote, clampOffer, normalizeVehicleType } from '../utils/fare';
import { normalizeUgPhone } from '../utils/uganda';
import { notifyRide } from '../socket/socketHandler';

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

    // Normalize once so every downstream consumer (fare calc, driver
    // matching in socketHandler, earnings/history displays) agrees on the
    // vehicle type — the rider app sends "go" for economy, older driver
    // records use "standard"; all must resolve to the same canonical value.
    const normalizedRideType = normalizeVehicleType(rideType);

    // Professional Fare Calculation
    const fareRecommended = fareQuote(normalizedRideType, distanceKm || 0, durationMin || 0);
    const finalFareOffered = clampOffer(normalizedRideType, distanceKm || 0, durationMin || 0, fareOffered || fareRecommended);

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
        normalizedRideType,
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

// ─── Get Active Ride (rider's or driver's in-progress ride) ──
router.get('/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const db = getDB();

    // Most recent ride the user is part of that isn't finished/cancelled.
    const ride = await db.get(
      `SELECT * FROM rides
       WHERE (userId = ? OR driverId = ?)
         AND status IN ('requested', 'accepted', 'arrived', 'ongoing')
       ORDER BY requestedAt DESC
       LIMIT 1`,
      [userId, userId]
    );
    if (!ride) return res.json({ ride: null });

    const rider = await db.get(
      `SELECT u.id, u.fullName, u.phone, COALESCE(dp.rating, 5) AS rating
       FROM users u LEFT JOIN driver_profiles dp ON dp.userId = u.id
       WHERE u.id = ?`,
      [ride.userId]
    );

    let driver: any = null;
    if (ride.driverId) {
      driver = await db.get(
        `SELECT u.id, u.fullName, u.phone, u.currentLat, u.currentLng,
                dp.plate, dp.vehicleType, dp.rating
         FROM users u LEFT JOIN driver_profiles dp ON dp.userId = u.id
         WHERE u.id = ?`,
        [ride.driverId]
      );
    }

    res.json({
      ride: {
        ...ride,
        pickup: { address: ride.pickupName, lat: ride.pickupLat, lng: ride.pickupLng },
        destination: { address: ride.dropName, lat: ride.dropLat, lng: ride.dropLng }
      },
      rider,
      driver,
      isDriver: ride.driverId === userId
    });
  } catch (error) {
    console.error('Active ride error:', error);
    res.status(500).json({ message: 'Error fetching active ride' });
  }
});

// ─── Cancel Ride (rider or assigned driver) ─────────────────
router.post('/:rideId/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.user?.userId;
    const db = getDB();

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.userId !== userId && ride.driverId !== userId) {
      return res.status(403).json({ message: 'You can only cancel a ride you are part of' });
    }
    if (!['requested', 'accepted', 'arrived', 'ongoing'].includes(ride.status)) {
      return res.status(400).json({ message: `A ride that is ${ride.status} can't be cancelled` });
    }

    await db.run(
      'UPDATE rides SET status = ?, cancelledAt = ? WHERE id = ?',
      ['cancelled', new Date().toISOString(), rideId]
    );

    // If a driver had already been assigned, free them back up (still online = available).
    if (ride.driverId) {
      await db.run(
        'UPDATE users SET isAvailable = TRUE WHERE id = ? AND isOnline = TRUE',
        [ride.driverId]
      );
    }

    // Tell the other party in real time (fire & forget).
    notifyRide(String(rideId), ride.userId, ride.driverId, 'ride-cancelled', {
      rideId,
      cancelledBy: userId,
      message: userId === ride.userId ? 'The rider cancelled the ride.' : 'The driver cancelled the ride.'
    });

    res.json({ message: 'Ride cancelled' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ message: 'Failed to cancel ride' });
  }
});

// ─── Rate Driver (rider only, after completion) ─────────────
router.post('/:rideId/rate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const { rating } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.userId !== userId) return res.status(403).json({ message: 'Only the rider can rate this ride' });
    if (ride.status !== 'completed') return res.status(400).json({ message: 'You can only rate a completed ride' });
    if (!ride.driverId) return res.status(400).json({ message: 'No driver was assigned to this ride' });

    // Store on the ride, then fold into the driver's rolling rating.
    await db.run('UPDATE rides SET riderRating = ? WHERE id = ?', [rating, rideId]);

    const profile = await db.get(
      'SELECT rating, ratingCount FROM driver_profiles WHERE userId = ?',
      [ride.driverId]
    );
    if (profile) {
      const newCount = (profile.ratingCount || 0) + 1;
      const newRating = ((profile.rating || 5) * (profile.ratingCount || 0) + rating) / newCount;
      await db.run(
        'UPDATE driver_profiles SET rating = ?, ratingCount = ? WHERE userId = ?',
        [Math.round(newRating * 100) / 100, newCount, ride.driverId]
      );
    } else {
      await db.run(
        'INSERT INTO driver_profiles (userId, rating, ratingCount) VALUES (?, ?, 1)',
        [ride.driverId, rating]
      );
    }

    res.json({ message: 'Thanks for rating your driver!' });
  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ message: 'Failed to save rating' });
  }
});

// ─── Tip Driver (rider only, during or after the ride) ──────
router.post('/:rideId/tip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const { amount } = req.body;
    const userId = req.user?.userId;
    const db = getDB();

    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({ message: 'Tip amount must be a positive number (max UGX 1,000,000)' });
    }

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.userId !== userId) return res.status(403).json({ message: 'Only the rider can tip on this ride' });
    if (!ride.driverId) return res.status(400).json({ message: 'No driver was assigned to this ride' });
    if (!['ongoing', 'completed'].includes(ride.status)) {
      return res.status(400).json({ message: 'You can only tip during or after a ride' });
    }

    const roundedAmount = Math.round(amount);

    if (!ride.settled) {
      // Ride hasn't been settled yet — just accumulate the tip; it will be
      // paid out to the driver (100%) when settleRidePayment() runs.
      await db.run('UPDATE rides SET tip = COALESCE(tip, 0) + ? WHERE id = ?', [roundedAmount, rideId]);
      return res.json({ message: 'Tip added — it will be paid to your driver with the ride settlement.', tip: (ride.tip || 0) + roundedAmount });
    }

    // Ride already settled (cash or wallet) — credit the driver's wallet immediately, 100% to driver.
    const tx = await db.getTransactionClient();
    try {
      await tx.query('BEGIN');
      await tx.query('UPDATE rides SET tip = COALESCE(tip, 0) + ? WHERE id = ?', [roundedAmount, rideId]);
      await tx.query(
        `INSERT INTO wallets (userId, balance) VALUES (?, ?)
         ON CONFLICT(userId) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance`,
        [ride.driverId, roundedAmount]
      );
      await tx.query(
        'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
        [`tx_tip_${Date.now()}_${ride.driverId}`, ride.driverId, 'tip', roundedAmount, `Tip for ride ${rideId} (100% to driver)`, rideId]
      );
      await tx.query('COMMIT');
      tx.release();
    } catch (e) {
      await tx.query('ROLLBACK');
      tx.release();
      throw e;
    }

    res.json({ message: 'Tip sent to your driver!', tip: (ride.tip || 0) + roundedAmount });
  } catch (error) {
    console.error('Tip error:', error);
    res.status(500).json({ message: 'Failed to send tip' });
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

    // Security check: the rider or the assigned driver can always view a ride.
    // Pending ('requested') rides are broadcast to drivers, so any driver may
    // view those in order to decide whether to accept.
    const isDriver = req.user?.role === 'driver' || req.user?.role === 'motorist';
    const allowed =
      ride.userId === userId ||
      ride.driverId === userId ||
      (ride.status === 'requested' && isDriver);
    if (!allowed) {
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
