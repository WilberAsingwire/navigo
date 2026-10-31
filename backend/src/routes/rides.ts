import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { rideRequestLimiter } from '../middleware/rateLimit';
import { VEHICLES, fareBreakdown, clampOffer, offerBounds } from '../utils/fare';
import { normalizeUgPhone } from '../utils/uganda';
import { notifyRide } from '../socket/socketHandler';
import { settleRidePayment } from '../utils/settlement';
import { getDrivingRoute, isUgandaPoint } from '../services/mappingService';
import { syncDriverAvailability } from '../utils/driverAvailability';

const router = express.Router();

// Vehicle type normalization — frontend uses go/comfort/xl, backend fare uses boda/economy/comfort/xl
const normalizeVehicleType = (raw: string): string => {
  const map: Record<string, string> = {
    boda: 'boda',
    go: 'economy',
    economy: 'economy',
    standard: 'economy',
    comfort: 'comfort',
    xl: 'xl',
    van: 'xl',
    car: 'economy',
  };
  return map[(raw || '').toLowerCase()] || 'economy';
};

// ─── Multi-vehicle fare quotations ─────────────────────────────
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const kmNum = Number(req.query.km);
    const minNum = Number(req.query.min ?? 0);
    const service: 'ride' | 'delivery' = String(req.query.serviceType) === 'delivery' ? 'delivery' : 'ride';

    if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 500) {
      return res.status(400).json({ ok: false, message: 'Invalid distance' });
    }
    if (!Number.isFinite(minNum) || minNum < 0 || minNum > 600) {
      return res.status(400).json({ ok: false, message: 'Invalid duration' });
    }

    const quotes: Record<string, any> = {};
    for (const vehicle of VEHICLES) {
      const breakdown = fareBreakdown(vehicle.type, kmNum, minNum, service);
      quotes[vehicle.type] = {
        fare: breakdown.total,
        breakdown,
        offerBounds: offerBounds(vehicle.type, kmNum, minNum, service),
      };
    }

    return res.json({ ok: true, km: kmNum, durationMin: minNum, serviceType: service, quotes });
  } catch (error) {
    console.error('Quotes error:', error);
    return res.status(500).json({ ok: false, message: 'Error calculating vehicle quotes' });
  }
});

// ─── Authoritative driving route ─────────────────────────────
router.get('/route', async (req: Request, res: Response) => {
  try {
    const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) };
    const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) };

    if (!isUgandaPoint(from) || !isUgandaPoint(to)) {
      return res.status(400).json({ ok: false, message: 'Both route points must be within Uganda.' });
    }

    const route = await getDrivingRoute(from, to);
    return res.json({ ok: true, route });
  } catch (error: any) {
    console.error('Route error:', error?.message || error);
    return res.status(503).json({ ok: false, message: 'Driving route is temporarily unavailable.' });
  }
});

// ─── Fare Quotation ──────────────────────────────────────
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { type, km, min, serviceType = 'ride' } = req.query;
    if (!type || km === undefined) {
      return res.status(400).json({ message: 'Ride type and distance are required' });
    }

    const normalized = normalizeVehicleType(String(type));
    const kmNum = Number(km);
    const minNum = Number(min ?? 0);
    const service: 'ride' | 'delivery' = String(serviceType) === 'delivery' ? 'delivery' : 'ride';

    if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 500) {
      return res.status(400).json({ message: 'Invalid distance' });
    }
    if (!Number.isFinite(minNum) || minNum < 0 || minNum > 600) {
      return res.status(400).json({ message: 'Invalid duration' });
    }

    const breakdown = fareBreakdown(normalized, kmNum, minNum, service);
    return res.json({
      ok: true,
      fare: breakdown.total,
      breakdown,
      vehicleType: normalized,
      serviceType: service,
    });
  } catch (error) {
    console.error('Quote error:', error);
    return res.status(500).json({ message: 'Error calculating quote' });
  }
});

// ─── Request Ride/Delivery ───────────────────────────────────────
router.post('/request', authenticate, rideRequestLimiter, async (req: Request, res: Response) => {
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

    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (!pickup || !destination || !rideType) {
      return res.status(400).json({ message: 'Missing required ride details.' });
    }
    // Validate coordinates
    const isValidCoord = (c: any) => c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng) && c.lat >= -5 && c.lat <= 5 && c.lng >= 29 && c.lng <= 36;
    if (!isValidCoord(pickup) || !isValidCoord(destination)) {
      return res.status(400).json({ message: 'Invalid pickup or destination coordinates. Must be within Uganda.' });
    }
    if (!pickup.address || !destination.address) {
      return res.status(400).json({ message: 'Pickup and destination addresses are required.' });
    }
    if (serviceType === 'delivery') {
      if (!packageDetails || !receiverName || !receiverPhone) {
        return res.status(400).json({ message: 'For delivery: package details, receiver name and phone are required.' });
      }
      const normalizedPhone = normalizeUgPhone(receiverPhone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Invalid receiver phone number. Use 07... format.' });
      }
    }

    const normalizedRideType = normalizeVehicleType(rideType);
    const clientDist = Number(distanceKm);
    const clientDur = Number(durationMin);
    if (Number.isFinite(clientDist) && (clientDist < 0 || clientDist > 500)) {
      return res.status(400).json({ message: 'Invalid distance' });
    }
    if (Number.isFinite(clientDur) && (clientDur < 0 || clientDur > 600)) {
      return res.status(400).json({ message: 'Invalid duration' });
    }

    const finalServiceType: 'ride' | 'delivery' = serviceType === 'delivery' ? 'delivery' : 'ride';

    // Authoritative routing: the server recalculates the road route from the
    // coordinates instead of trusting client-supplied distance/time.
    let route;
    try {
      route = await getDrivingRoute(pickup, destination);
    } catch (error: any) {
      console.error('Authoritative route failed:', error?.message || error);
      return res.status(503).json({ message: 'Unable to calculate a road route right now. Please try again.' });
    }

    const distNum = route.distanceKm;
    const durNum = route.durationMin;

    // Auto-expire this rider's stale unaccepted requests first, so an old
    // request that nobody accepted doesn't lock them out of booking forever.
    await db.run(
      "UPDATE rides SET status = 'cancelled', cancelledAt = CURRENT_TIMESTAMP WHERE userId = ? AND status = 'requested' AND expiresAt IS NOT NULL AND expiresAt < CURRENT_TIMESTAMP",
      [userId]
    );

    // Prevent duplicate active requests
    const existingActive = await db.get(
      "SELECT id FROM rides WHERE userId = ? AND status IN ('requested','accepted','arrived','ongoing') LIMIT 1",
      [userId]
    );
    if (existingActive) {
      return res.status(400).json({ message: 'You already have an active ride. Complete or cancel it before requesting a new one.' });
    }

    const fareRecommended = fareBreakdown(normalizedRideType, distNum, durNum, finalServiceType).total;
    const finalFareOffered = clampOffer(normalizedRideType, distNum, durNum, Number(fareOffered) || fareRecommended, finalServiceType);

    if (paymentMethod === 'wallet') {
      const wallet = await db.get('SELECT balance FROM wallets WHERE userId = ?', [userId]);
      if (!wallet || wallet.balance < finalFareOffered) {
        return res.status(400).json({ message: 'Insufficient wallet balance for this ride. Please top up or use cash.' });
      }
    }

    const rideId = 'ride_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // auto-expire after 3 min if not accepted

    await db.run(
      `INSERT INTO rides (
        id, userId, serviceType, vehicleType, status, paymentMethod,
        pickupName, pickupLat, pickupLng,
        dropName, dropLat, dropLng,
        distanceKm, durationMin,
        fareRecommended, fareOffered, fareFinal,
        packageDetails, receiverName, receiverPhone,
        geometry,
        requestedAt, expiresAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rideId,
        userId,
        finalServiceType,
        normalizedRideType,
        'requested',
        paymentMethod || 'cash',
        pickup.address.slice(0, 200), pickup.lat, pickup.lng,
        destination.address.slice(0, 200), destination.lat, destination.lng,
        distNum,
        durNum,
        fareRecommended,
        finalFareOffered,
        finalFareOffered, // fareFinal = the rider's clamped offer — what settlement actually charges

        packageDetails ? String(packageDetails).slice(0, 500) : null,
        receiverName ? String(receiverName).slice(0, 100) : null,
        receiverPhone ? String(receiverPhone).slice(0, 20) : null,
        JSON.stringify(route.geometry),
        new Date().toISOString(),
        expiresAt
      ]
    );

    res.json({
      message: serviceType === 'delivery' ? 'Delivery requested successfully!' : 'Ride requested successfully!',
      ride: {
        id: rideId,
        fareRecommended,
        fareOffered: finalFareOffered,
        status: 'requested',
        expiresAt,
        distanceKm: distNum,
        durationMin: durNum,
        route: { geometry: route.geometry, provider: route.provider }
      }
    });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ message: 'Failed to request booking. Please try again.' });
  }
});

// ─── Get Active Ride (rider's or driver's in-progress ride) ──
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    // Most recent ride the user is part of that isn't finished/cancelled.
    // Expired unaccepted requests are NOT active — don't resurrect them.
    const ride = await db.get(
      `SELECT * FROM rides
       WHERE (userId = ? OR driverId = ?)
         AND status IN ('requested', 'accepted', 'arrived', 'ongoing')
         AND NOT (status = 'requested' AND expiresAt IS NOT NULL AND expiresAt < CURRENT_TIMESTAMP)
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
router.post('/:rideId/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = (req as AuthRequest).user?.userId;
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
    // Release the assigned driver if they are still online and have no other trip.
    await syncDriverAvailability(db, ride.driverId);

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

// ─── Update Ride Status (REST fallback for when socket drops) ──────────
// Authorizes same way the socket handler does: only the assigned driver can transition.
router.post('/:rideId/status', authenticate, async (req: Request, res: Response) => {
  try {
    const rideId = String(req.params.rideId);
    const { status } = req.body;
    const userId = (req as AuthRequest).user?.userId as string | undefined;
    const db = getDB();

    const ride = await db.get('SELECT driverId, userId, status as curStatus, expiresAt FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.driverId !== userId) {
      return res.status(403).json({ message: 'Only the assigned driver can update status' });
    }

    const allowed: Record<string, string[]> = {
      requested: ['accepted'],
      accepted: ['arrived'],
      arrived: ['ongoing'],
      ongoing: ['completed'],
    };
    if (!allowed[ride.curStatus]?.includes(status)) {
      return res.status(400).json({ message: `Can't move a ${ride.curStatus} ride to ${status}` });
    }

    // Expired unaccepted requests can't be accepted via the REST fallback either.
    if (ride.curStatus === 'requested' && status === 'accepted') {
      const expiresRaw = ride.expiresat || ride.expiresAt;
      if (expiresRaw) {
        const expiry = new Date(expiresRaw);
        if (!isNaN(expiry.getTime()) && expiry < new Date()) {
          await db.run(
            "UPDATE rides SET status = 'cancelled', cancelledAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'requested'",
            [rideId]
          );
          return res.status(400).json({ message: 'This ride request has expired.' });
        }
      }
    }

    await db.run('UPDATE rides SET status = ? WHERE id = ?', [status, rideId]);
    if (status === 'completed') {
      await syncDriverAvailability(db, userId);
    }

    let settlementResult = null;
    if (status === 'completed') {
      settlementResult = await settleRidePayment(rideId);
      if (settlementResult?.fallback === 'cash') {
        notifyRide(String(rideId), ride.userId ?? null, userId ?? null, 'payment-fallback-cash', {
          rideId: String(rideId),
          message: 'Wallet balance was insufficient — please settle this fare in cash.',
        });
      }
    }

    notifyRide(String(rideId), ride.userId ?? null, userId ?? null, 'status-changed', { rideId: String(rideId), status });

    res.json({ ok: true, status, settlement: settlementResult });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ─── Send tip mid-ride or after completion (rider only) ──
router.post('/:rideId/tip', authenticate, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { amount } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const tipAmt = Number(amount);
    if (!Number.isFinite(tipAmt) || tipAmt <= 0 || tipAmt > 50000) {
      return res.status(400).json({ message: 'Invalid tip amount (max UGX 50,000).' });
    }

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.userId !== userId) return res.status(403).json({ message: 'Only the rider can tip.' });
    if (!ride.driverId) return res.status(400).json({ message: 'Wait for a driver to be assigned before tipping.' });

    if (ride.paymentMethod === 'wallet') {
      const tx = await db.getTransactionClient();
      try {
        await tx.query('BEGIN');
        const walletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [userId]);
        const wallet = walletRes.rows[0];
        if (!wallet || wallet.balance < tipAmt) {
          await tx.query('ROLLBACK');
          tx.release();
          return res.status(400).json({ message: 'Insufficient wallet balance for this tip.' });
        }
        await tx.query('UPDATE wallets SET balance = balance - ? WHERE userId = ?', [tipAmt, userId]);
        await tx.query('INSERT INTO wallets (userId, balance) VALUES (?, 0) ON CONFLICT(userId) DO NOTHING', [ride.driverId]);
        await tx.query('UPDATE wallets SET balance = balance + ? WHERE userId = ?', [tipAmt, ride.driverId]);
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_tip_${Date.now()}_${ride.driverId}`, ride.driverId, 'tip', tipAmt, `Tip for ride ${rideId}`, rideId]
        );
        await tx.query(
          'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
          [`tx_tip_pay_${Date.now()}_${userId}`, userId, 'tip_payment', -tipAmt, `Tip for ride ${rideId}`, rideId]
        );
        await tx.query('UPDATE rides SET tip = COALESCE(tip,0) + ? WHERE id = ?', [tipAmt, rideId]);
        await tx.query('COMMIT');
        tx.release();
      } catch (e) {
        try { await tx.query('ROLLBACK'); } catch {}
        tx.release();
        throw e;
      }
    } else {
      // Cash trips — just record the intended tip so it shows up on settlement.
      await db.run('UPDATE rides SET tip = COALESCE(tip,0) + ? WHERE id = ?', [tipAmt, rideId]);
    }

    // Notify driver in real time
    notifyRide(String(rideId), userId ?? null, ride.driverId ?? null, 'ride-tip', { rideId, amount: tipAmt });

    res.json({ ok: true, message: `Tip of UGX ${tipAmt.toLocaleString()} sent!`, tipTotal: Number(ride.tip || 0) + tipAmt });
  } catch (error) {
    console.error('Tip error:', error);
    res.status(500).json({ message: 'Failed to send tip.' });
  }
});

// ─── Rate Driver (rider only, after completion) — with duplicate guard ──
router.post('/:rideId/rate', authenticate, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { rating, tags, tip } = req.body;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
    }
    if (tip !== undefined && (typeof tip !== 'number' || tip < 0 || tip > 50000)) {
      return res.status(400).json({ message: 'Invalid tip amount' });
    }

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.userId !== userId) return res.status(403).json({ message: 'Only the rider can rate this ride' });
    if (ride.status !== 'completed') return res.status(400).json({ message: 'You can only rate a completed ride' });
    if (!ride.driverId) return res.status(400).json({ message: 'No driver was assigned to this ride' });
    if (ride.riderRating) return res.status(400).json({ message: 'You have already rated this ride' });

    await db.run('UPDATE rides SET riderRating = ?, riderTags = ?, tip = ? WHERE id = ?', [
      rating,
      tags ? JSON.stringify(tags).slice(0, 500) : null,
      tip || 0,
      rideId
    ]);

    // If tip provided and wallet payment, handle tip settlement atomically
    // (balance check + debit + credit all inside one transaction).
    if (tip && tip > 0 && ride.paymentMethod === 'wallet') {
      const tx = await db.getTransactionClient();
      try {
        await tx.query('BEGIN');
        const walletRes = await tx.query('SELECT balance FROM wallets WHERE userId = ? FOR UPDATE', [userId]);
        const wallet = walletRes.rows[0];
        if (wallet && wallet.balance >= tip) {
          await tx.query('UPDATE wallets SET balance = balance - ? WHERE userId = ?', [tip, userId]);
          await tx.query(
            `INSERT INTO wallets (userId, balance) VALUES (?, 0)
             ON CONFLICT(userId) DO NOTHING`,
            [ride.driverId]
          );
          await tx.query(
            `UPDATE wallets SET balance = balance + ? WHERE userId = ?`,
            [tip, ride.driverId]
          );
          await tx.query(
            'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
            [`tx_tip_${Date.now()}_${ride.driverId}`, ride.driverId, 'tip', tip, `Tip for ride ${rideId}`, rideId]
          );
          await tx.query(
            'INSERT INTO wallet_transactions (id, userId, kind, amount, note, rideId) VALUES (?, ?, ?, ?, ?, ?)',
            [`tx_tip_pay_${Date.now()}_${userId}`, userId, 'tip_payment', -tip, `Tip for ride ${rideId}`, rideId]
          );
          await tx.query('COMMIT');
        } else {
          await tx.query('ROLLBACK');
          console.error('Tip settlement failed: insufficient wallet balance');
        }
        tx.release();
      } catch (e) {
        try { await tx.query('ROLLBACK'); } catch {}
        tx.release();
        console.error('Tip settlement failed:', e);
      }
    }

    const profile = await db.get('SELECT rating, ratingCount FROM driver_profiles WHERE userId = ?', [ride.driverId]);
    if (profile) {
      const newCount = (profile.ratingCount || 0) + 1;
      const newRating = ((parseFloat(profile.rating) || 5) * (profile.ratingCount || 0) + rating) / newCount;
      await db.run(
        'UPDATE driver_profiles SET rating = ?, ratingCount = ?, totalTrips = totalTrips + 1 WHERE userId = ?',
        [Math.round(newRating * 100) / 100, newCount, ride.driverId]
      );
    } else {
      await db.run(
        'INSERT INTO driver_profiles (userId, rating, ratingCount, totalTrips) VALUES (?, ?, 1, 1)',
        [ride.driverId, rating]
      );
    }

    res.json({ message: 'Thanks for rating your driver!' });
  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ message: 'Failed to save rating' });
  }
});

// ─── Get Ride Details ──────────────────────────────────────
router.get('/details/:rideId', authenticate, async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Security check: the rider or the assigned driver can always view a ride.
    // Pending ('requested') rides are broadcast to drivers, so any driver may
    // view those in order to decide whether to accept.
    const isDriver = (req as AuthRequest).user?.role === 'driver' || (req as AuthRequest).user?.role === 'motorist';
    const allowed =
      ride.userId === userId ||
      ride.driverId === userId ||
      (ride.status === 'requested' && isDriver);
    if (!allowed) {
      return res.status(403).json({ message: 'Unauthorized: You are not part of this ride' });
    }

    const isDirectParticipant = ride.userId === userId || ride.driverId === userId;

    // Only return PII-less summary to drivers browsing an open request; full data only if they're the actual rider/driver.
    const rider = isDirectParticipant
      ? await db.get(
          `SELECT u.id, u.fullName, u.phone, u.verificationStatus,
                  COALESCE(dp.rating, 5) AS rating,
                  COALESCE(dp.totalTrips, 0) AS totalTrips
           FROM users u
           LEFT JOIN driver_profiles dp ON dp.userId = u.id
           WHERE u.id = ?`,
          [ride.userId]
        )
      : { id: ride.userId, rating: 5, totalTrips: 0 };

    res.json({
      ...ride,
      rider,
      // Hide destination exact address/coords from non-participants to prevent stalking/targeting.
      pickup: { address: ride.pickupName, lat: ride.pickupLat, lng: ride.pickupLng },
      destination: isDirectParticipant
        ? { address: ride.dropName, lat: ride.dropLat, lng: ride.dropLng }
        : { address: '', lat: null, lng: null },
    });
  } catch (error) {
    console.error('Ride details error:', error);
    res.status(500).json({ message: 'Error fetching ride details' });
  }
});

// ─── Get Recent Trips (for Home Screen) ────────────────────────────────
router.get('/recent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const db = getDB();

    const recentRides = await db.all(
      'SELECT * FROM rides WHERE userId = ? AND status = ? ORDER BY requestedAt DESC LIMIT 3',
      [userId, 'completed']
    );

    const formatted = recentRides.map((ride: any) => ({
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
router.get('/history/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (userId !== (req as AuthRequest).user?.userId) return res.status(403).json({ message: 'Unauthorized' });

    const db = getDB();
    const statusFilter = req.query.status as string;

    let query = `
      SELECT r.*, u.fullName as driverName, COALESCE(dp.rating, 5) as driverRating
      FROM rides r
      LEFT JOIN users u ON r.driverId = u.id
      LEFT JOIN driver_profiles dp ON dp.userId = r.driverId
      WHERE (r.userId = ? OR r.driverId = ?)
    `;
    const params: any[] = [userId, userId];

    if (statusFilter && statusFilter !== 'all') {
      // Qualify with r. — both rides and users have a `status` column, and the
      // unqualified reference is ambiguous after the joins.
      query += ' AND r.status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY r.requestedAt DESC';

    const rides = await db.all(query, params);

    // Format for frontend compatibility
    const formattedRides = rides.map((ride: any) => ({
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
