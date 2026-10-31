import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';
import { settleRidePayment } from '../utils/settlement';
import { verifyToken } from '../utils/auth';
import { getBlockMessage } from '../utils/userStatus';
import { canReceiveBookings, syncDriverAvailability } from '../utils/driverAvailability';

let ioInstance: Server | null = null;

/** Called from index.ts so REST routes can emit socket events (e.g. cancellations). */
export const setIO = (io: Server) => { ioInstance = io; };

/** Force-disconnect every live socket belonging to a user (used when banning/suspending/deleting). */
export const disconnectUserSockets = (userId: string) => {
  if (!ioInstance) return;
  // Each user auto-joins a personal room named after their userId.
  ioInstance.in(userId).disconnectSockets(true);
};

/** Push a driver's latest persisted GPS position to the admin live-map room. */
export const notifyAdminLocation = (userId: string, lat: number, lng: number) => {
  if (!ioInstance) return;
  ioInstance.to('admins').emit('admin-location-updated', {
    userId,
    lat,
    lng,
    timestamp: Date.now(),
  });
};

/** Emit to the ride room + the rider's and driver's personal rooms. */
export const notifyRide = (rideId: string, riderId: string | null, driverId: string | null, event: string, payload: any) => {
  if (!ioInstance) return;
  // De-duplicated delivery (M10): participants who joined the ride room AND
  // have personal rooms used to receive every event twice. Emit to personal
  // rooms when we know them; use the ride room only as the fallback.
  if (riderId || driverId) {
    if (riderId) ioInstance.to(riderId).emit(event, payload);
    if (driverId) ioInstance.to(driverId).emit(event, payload);
  } else {
    ioInstance.to(rideId).emit(event, payload);
  }
};

// Helper to verify if a user is part of a ride
async function isRideMember(userId: string, rideId: string): Promise<boolean> {
  const db = getDB();
  const ride = await db.get('SELECT userId, driverId FROM rides WHERE id = ?', [rideId]);
  return !!(ride && (ride.userId === userId || ride.driverId === userId));
}

// ─── Driver matching helpers ────────────────────────────
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/** Which ride types a driver's registered vehicle can serve. */
const SERVES: Record<string, string[]> = {
  boda: ['boda'],
  motorcycle: ['boda'],
  car: ['economy'],
  go: ['economy'],
  economy: ['economy'],
  standard: ['economy'],
  comfort: ['comfort', 'economy'],
  van: ['xl', 'economy'],
  xl: ['xl', 'economy'],
};

const canServe = (driverVehicle: string | null | undefined, rideType: string): boolean => {
  const dv = (driverVehicle || '').toLowerCase().trim();
  if (!dv) return true; // driver hasn't registered a vehicle type — don't exclude them
  const served = SERVES[dv];
  if (!served) return true; // unknown vehicle label — be permissive so rides still match
  return served.includes(rideType);
};

/** Max pickup distance for targeted dispatch. Beyond this we broaden the net. */
const MATCH_RADIUS_KM = Number(process.env.MATCH_RADIUS_KM || 12);

const rateLimitMap = new Map<string, { count: number; reset: number }>();
const checkSocketRateLimit = (key: string, max: number, windowMs: number): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
};

export const setupSocketHandlers = (io: Server) => {
  // ─── Authentication Middleware ──────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: Token is required'));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
    // Banned/suspended accounts may not open realtime connections either.
    const blockMessage = await getBlockMessage(decoded.id);
    if (blockMessage) {
      return next(new Error(blockMessage));
    }
    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.role;
    console.log(`🌐 User connected: ${userId} (${userRole}) | Socket: ${socket.id}`);

    // Auto-join personal room + drivers room
    socket.join(userId);
    if (userRole === 'driver' || userRole === 'motorist') {
      socket.join('drivers');
      console.log(`👤 Driver ${userId} joined drivers room`);
    }
    if (userRole === 'admin') {
      socket.join('admins');
    }

    // Join a room based on userId to receive targeted notifications
    socket.on('join', (userIdFromClient: string) => {
      // Security check: only allow joining your own room
      if (userIdFromClient !== userId) {
        return socket.emit('error', { message: 'Unauthorized: You can only join your own room' });
      }
      socket.join(userId);
      console.log(`👤 User ${userId} joined their private room`);
    });

    // Securely join a ride room for real-time tracking
    socket.on('join-ride-room', async (data: { rideId: string }) => {
      const { rideId } = data;
      const db = getDB();
      try {
        const ride = await db.get('SELECT userId, driverId FROM rides WHERE id = ?', [rideId]);

        if (!ride) {
          socket.emit('error', { message: 'Ride not found.' });
          return;
        }

        // Security check: only rider or driver of this ride can join
        if (userId !== ride.userId && userId !== ride.driverId) {
          socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
          return;
        }

        socket.join(rideId);
        console.log(`🚕 Socket ${socket.id} joined ride room ${rideId}`);
      } catch (e) {
        console.error('Error joining ride room:', e);
        socket.emit('error', { message: 'Internal server error joining ride room.' });
      }
    });

    // Rider requests a ride — dispatched with vehicle-type + proximity matching
    socket.on('request-ride', async (data: { userId: string; rideId: string }) => {
      if (!checkSocketRateLimit(`req-ride:${userId}`, 5, 60000)) {
        return socket.emit('error', { message: 'Too many ride requests. Please wait a minute.' });
      }
      if (data.userId !== userId) {
        return socket.emit('error', { message: 'Unauthorized request' });
      }
      const { rideId } = data;
      const db = getDB();

      try {
        // The ride must exist, belong to this rider, and still be open.
        const ride = await db.get(
          "SELECT vehicleType, pickupLat, pickupLng, status FROM rides WHERE id = ? AND userId = ?",
          [rideId, userId]
        );
        if (!ride || ride.status !== 'requested') {
          return socket.emit('error', { message: 'Ride not found or no longer open.' });
        }

        // Approved, online, available drivers with their vehicle + last location.
        const drivers = await db.all(
          `SELECT u.id,
                  COALESCE(dp.vehicleType, u.vehicleType) AS vehicleType,
                  COALESCE(dp.lat, u.currentLat) AS lat,
                  COALESCE(dp.lng, u.currentLng) AS lng,
                  u.lastLocationAt
           FROM users u
           LEFT JOIN driver_profiles dp ON dp.userId = u.id
           WHERE (u.role = ? OR u.role = ?) AND u.verificationStatus = ?
             AND u.isOnline = TRUE AND u.isAvailable = TRUE
             AND COALESCE(u.status, 'active') = 'active'
             AND u.lastLocationAt IS NOT NULL
             AND u.lastLocationAt >= CURRENT_TIMESTAMP - INTERVAL '90 seconds'
           LIMIT 200`,
          ['driver', 'motorist', 'approved']
        );

        // 1) Filter by vehicle type (a boda can't serve an XL request).
        const eligible = drivers.filter((d: any) => canServe(d.vehicleType, ride.vehicleType));

        // 2) Prefer drivers within MATCH_RADIUS_KM of the pickup. If nobody
        //    with a known location is nearby, broaden to all eligible drivers
        //    (some may not have reported a location yet) — a match beats none.
        const pLat = Number(ride.pickupLat);
        const pLng = Number(ride.pickupLng);
        const near = eligible.filter((d: any) =>
          d.lat != null && d.lng != null &&
          haversineKm(pLat, pLng, Number(d.lat), Number(d.lng)) <= MATCH_RADIUS_KM
        );
        const targets: any[] = near.length > 0 ? near : eligible;

        if (targets.length === 0) {
          return socket.emit('no-drivers-found', {
            message: 'No drivers available for this vehicle type right now. Try again in a minute or pick another ride type.',
          });
        }

        const payload = { rideId, riderId: userId, vehicleType: ride.vehicleType, timestamp: new Date().toISOString() };
        // Targeted dispatch: each matched driver's personal room (not the whole fleet) + admins.
        for (const d of targets) io.to(d.id).emit('ride-requested', payload);
        io.to('admins').emit('ride-requested', payload);
        console.log(`🚕 Ride ${rideId} (${ride.vehicleType}) dispatched to ${targets.length}/${drivers.length} drivers (${near.length > 0 ? `within ${MATCH_RADIUS_KM}km` : 'radius widened'})`);
      } catch (e) {
        console.error('request-ride dispatch error:', e);
        socket.emit('error', { message: 'Failed to notify drivers. Please retry.' });
      }
    });

    // Driver accepts a ride — FIXED: check driver not already on active ride
    socket.on('accept-ride', async (data: { driverId: string; rideId: string }) => {
      if (!checkSocketRateLimit(`accept:${userId}`, 10, 60000)) {
        return socket.emit('error', { message: 'Too many attempts. Slow down.' });
      }
      const { driverId, rideId } = data;
      if (userRole !== 'driver' && userRole !== 'motorist') {
        return socket.emit('error', { message: 'Unauthorized: Only drivers can accept rides' });
      }
      if (driverId !== userId) {
        return socket.emit('error', { message: 'Unauthorized: Driver ID mismatch' });
      }

      const db = getDB();
      let actualRiderId = '';
      try {
        // Lock the driver row first. The online toggle and every acceptance
        // use this same lock, preventing two simultaneous assignments.
        const tx = await db.getTransactionClient();
        try {
          await tx.query('BEGIN');

          const driverResult = await tx.query(
            `SELECT isOnline, isAvailable, verificationStatus,
                    COALESCE(status, 'active') AS "accountStatus"
             FROM users
             WHERE id = ? AND role IN ('driver', 'motorist')
             FOR UPDATE`,
            [driverId]
          );
          const driver = driverResult.rows[0];
          if (!driver) throw new Error('Driver account not found.');
          if (!canReceiveBookings(driver, false) || driver.isAvailable !== true) {
            throw new Error('You must be online, approved and available to accept this request.');
          }

          // This check is inside the same driver-row lock, so two different
          // requests cannot be accepted by the same driver at the same time.
          const active = await tx.query(
            `SELECT id FROM rides
             WHERE driverId = ? AND status IN ('accepted', 'arrived', 'ongoing')
             LIMIT 1`,
            [driverId]
          );
          if (active.rows.length > 0) {
            throw new Error('You already have an active ride. Complete it first.');
          }

          // Lock the booking row so competing drivers cannot both accept it.
          const rideResult = await tx.query(
            'SELECT userId, status, expiresAt FROM rides WHERE id = ? FOR UPDATE',
            [rideId]
          );
          const ride = rideResult.rows[0];
          if (!ride) throw new Error('Ride not found.');
          if (ride.status !== 'requested') throw new Error('Ride is no longer available.');

          // Enforce request expiry — stale requests cannot be accepted later.
          let requestExpired = false;
          if (ride.expiresAt) {
            const expiry = new Date(ride.expiresAt);
            if (!isNaN(expiry.getTime()) && expiry < new Date()) {
              await tx.query(
                "UPDATE rides SET status = 'cancelled', cancelledAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'requested'",
                [rideId]
              );
              requestExpired = true;
            }
          }
          if (requestExpired) {
            // Commit the expiry transition; throwing here would roll it back.
            await tx.query('COMMIT');
            tx.release();
            return socket.emit('error', { message: 'This ride request has expired.' });
          }

          actualRiderId = ride.userId;
          const updateRes = await tx.query(
            `UPDATE rides
             SET status = 'accepted', driverId = ?, acceptedAt = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'requested'`,
            [driverId, rideId]
          );
          if (updateRes.rowCount === 0) throw new Error('Ride is no longer available.');

          await tx.query('UPDATE users SET isAvailable = FALSE WHERE id = ?', [driverId]);
          await tx.query('COMMIT');
          tx.release();
        } catch (e: any) {
          try { await tx.query('ROLLBACK'); } catch {}
          tx.release();
          throw e;
        }

        // Confirm to the accepting driver FIRST — the frontend must wait for
        // this (not assume success) because another driver may have won the race.
        socket.emit('accept-confirmed', { rideId, timestamp: new Date().toISOString() });

        io.to(actualRiderId).emit('ride-accepted', {
          rideId,
          driverId,
          message: 'Your driver has accepted the request!',
          timestamp: new Date().toISOString(),
        });
        // Notify other drivers that ride is taken
        socket.to('drivers').emit('ride-taken', { rideId });
        console.log(`✅ Ride ${rideId} accepted by Driver ${driverId}`);
      } catch (e: any) {
        console.error('Error accepting ride:', e);
        socket.emit('error', { message: e.message || 'Failed to accept ride.' });
      }
    });

    // Standalone driver location publishing for the driver's live map/admin
    // monitor. This is separate from ride-scoped location updates.
    socket.on('publish-location', async (data: { lat: number; lng: number }) => {
      if (!checkSocketRateLimit(`pub-loc:${userId}`, 12, 60000)) return;
      if (userRole !== 'driver' && userRole !== 'motorist') {
        return socket.emit('error', { message: 'Unauthorized: only drivers can publish live location' });
      }

      const lat = Number(data?.lat);
      const lng = Number(data?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -5 || lat > 5 || lng < 29 || lng > 36) return;

      const db = getDB();
      try {
        await db.run(
          'UPDATE users SET currentLat = ?, currentLng = ?, lastLocationAt = CURRENT_TIMESTAMP WHERE id = ?',
          [lat, lng, userId]
        );
        await db.run(
          'UPDATE driver_profiles SET lat = ?, lng = ? WHERE userId = ?',
          [lat, lng, userId]
        );
        io.to('admins').emit('admin-location-updated', {
          userId,
          lat,
          lng,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('Error publishing standalone driver location:', e);
      }
    });

    // Real-time location updates from Driver to Rider — FIXED: rate limited + correct columns
    socket.on('update-location', async (data: { rideId: string; lat: number; lng: number; userId: string }) => {
      if (!checkSocketRateLimit(`loc:${userId}`, 30, 60000)) return; // max 30 updates/min
      const { rideId, lat, lng, userId: clientUserId } = data;
      if (clientUserId !== userId) {
        return socket.emit('error', { message: 'Unauthorized location update' });
      }
      // Validate coordinates — must be within Uganda bbox roughly
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
      if (lat < -5 || lat > 5 || lng < 29 || lng > 36) return; // Uganda bounds guard

      if (userRole !== 'driver' && userRole !== 'motorist') {
        return socket.emit('error', { message: 'Unauthorized: only drivers can publish live location' });
      }

      const db = getDB();
      try {
        const ride = await db.get(
          "SELECT driverId, status FROM rides WHERE id = ?",
          [rideId]
        );
        if (!ride || ride.driverId !== userId || !['accepted', 'arrived', 'ongoing'].includes(ride.status)) {
          return socket.emit('error', { message: 'Unauthorized or inactive ride for location update' });
        }

        // Update both users table (for admin live map) and driver_profiles (for rider tracking).
        await db.run('UPDATE users SET currentLat = ?, currentLng = ?, lastLocationAt = CURRENT_TIMESTAMP WHERE id = ?', [lat, lng, userId]);
        await db.run('UPDATE driver_profiles SET lat = ?, lng = ? WHERE userId = ?', [lat, lng, userId]);

        socket.to(rideId).emit('location-updated', { lat, lng, userId, timestamp: Date.now() });
        io.to('admins').emit('admin-location-updated', { userId, lat, lng });
      } catch (e) {
        console.error('Error updating location:', e);
      }
    });

    // Ride status updates (arrived, started, completed)
    socket.on('update-status', async (data: { rideId: string; riderId: string; status: string }) => {
      const { rideId, status } = data;
      const db = getDB();

      try {
        const ride = await db.get('SELECT driverId, userId FROM rides WHERE id = ?', [rideId]);
        if (!ride || ride.driverId !== userId) {
          return socket.emit('error', { message: 'Unauthorized: Only the assigned driver can update status' });
        }

        // Guard: only forward legal transitions (a completed/cancelled ride can't be re-opened)
        const current = await db.get('SELECT status FROM rides WHERE id = ?', [rideId]);
        const allowed: Record<string, string[]> = {
          accepted: ['arrived'],
          arrived: ['ongoing'],
          ongoing: ['completed'],
        };
        if (!allowed[current?.status]?.includes(status)) {
          return socket.emit('error', { message: `Can't move a ${current?.status} ride to ${status}` });
        }

        await db.run('UPDATE rides SET status = ? WHERE id = ?', [status, rideId]);

        if (status === 'completed') {
          // Make the driver eligible for another request only after this trip
          // has left the active states, and only if they remain online/approved.
          await syncDriverAvailability(db, userId);
          console.log(`🏁 Ride ${rideId} marked as completed. Triggering settlement...`);
          const settlement = await settleRidePayment(rideId);
          if (settlement.success) {
            console.log(`💰 Settlement successful for ride ${rideId}`);
            // Wallet couldn't cover the fare → both parties must know the fare
            // is now collected in cash.
            if (settlement.fallback === 'cash') {
              notifyRide(rideId, ride.userId, userId, 'payment-fallback-cash', {
                rideId,
                message: 'Wallet balance was insufficient — please settle this fare in cash.',
              });
            }
          } else {
            console.error(`❌ Settlement failed for ride ${rideId}: ${settlement.message}`);
          }
        }

        // Notify the rider (from the DB, never client-supplied) + the ride room
        notifyRide(rideId, ride.userId, userId, 'status-changed', { rideId, status });
      } catch (e) {
        console.error('Error updating status:', e);
        socket.emit('error', { message: 'Failed to update status.' });
      }
    });

    // Chat logic — messages are PERSISTED so history survives reconnects and
    // there is an audit trail for disputes/safety investigations.
    socket.on('join-chat', async (d: any) => {
      const { rideId } = d;
      if (await isRideMember(userId, rideId)) {
        socket.join(rideId);
      } else {
        socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
      }
    });

    socket.on('send-message', async (d: any) => {
      const { rideId, message } = d;
      if (!socket.rooms.has(rideId)) {
        return socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
      }
      if (!checkSocketRateLimit(`chat:${userId}`, 30, 60000)) {
        return socket.emit('error', { message: 'You are sending messages too fast.' });
      }

      const text = String(message?.text || '').slice(0, 1000).trim();
      if (!text) return;

      const stored = {
        id: message?.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        senderId: userId, // ALWAYS from the authenticated socket, never the client payload
        senderName: String(message?.senderName || '').slice(0, 100),
        senderRole: String(message?.senderRole || userRole || '').slice(0, 20),
        timestamp: new Date().toISOString(),
      };

      try {
        const db = getDB();
        await db.run(
          'INSERT INTO ride_messages (id, rideId, senderId, senderName, senderRole, text) VALUES (?, ?, ?, ?, ?, ?)',
          [stored.id, rideId, stored.senderId, stored.senderName, stored.senderRole, stored.text]
        );
      } catch (e) {
        console.error('Failed to persist chat message:', e);
        // Still relay in real time even if persistence hiccups.
      }

      socket.to(rideId).emit('new-message', { ...stored, status: 'delivered' });
    });

    // Load persisted chat history (ack callback → ChatBox initial render).
    socket.on('load-messages', async (d: any, callback?: (messages: any[]) => void) => {
      try {
        const { rideId } = d || {};
        if (!rideId || typeof callback !== 'function') return;
        if (!(await isRideMember(userId, rideId))) return callback([]);

        const db = getDB();
        const rows = await db.all(
          'SELECT id, senderId, senderName, senderRole, text, createdAt FROM ride_messages WHERE rideId = ? ORDER BY createdAt ASC LIMIT 200',
          [rideId]
        );
        callback(rows.map((r: any) => ({
          id: r.id,
          text: r.text,
          senderId: r.senderId,
          senderName: r.senderName,
          senderRole: r.senderRole,
          timestamp: r.createdAt,
          status: 'delivered',
        })));
      } catch (e) {
        console.error('load-messages error:', e);
        if (typeof callback === 'function') callback([]);
      }
    });

    // Typing indicator + read receipts — relayed to the other ride participant.
    socket.on('typing', (d: any) => {
      const { rideId, isTyping } = d || {};
      if (rideId && socket.rooms.has(rideId)) {
        socket.to(rideId).emit('user-typing', { userId, isTyping: !!isTyping });
      }
    });

    socket.on('message-read', (d: any) => {
      const { rideId, messageId } = d || {};
      if (rideId && messageId && socket.rooms.has(rideId)) {
        socket.to(rideId).emit('message-read-confirmed', messageId);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🌐 User disconnected: ${userId} (${socket.id})`);
    });
  });
};
