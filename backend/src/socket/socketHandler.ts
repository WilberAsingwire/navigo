import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';
import { settleRidePayment } from '../utils/settlement';
import { verifyToken } from '../utils/auth';
import { getBlockMessage } from '../utils/userStatus';

let ioInstance: Server | null = null;

/** Called from index.ts so REST routes can emit socket events (e.g. cancellations). */
export const setIO = (io: Server) => { ioInstance = io; };

/** Force-disconnect every live socket belonging to a user (used when banning/suspending/deleting). */
export const disconnectUserSockets = (userId: string) => {
  if (!ioInstance) return;
  // Each user auto-joins a personal room named after their userId.
  ioInstance.in(userId).disconnectSockets(true);
};

/** Emit to the ride room + the rider's and driver's personal rooms. */
export const notifyRide = (rideId: string, riderId: string | null, driverId: string | null, event: string, payload: any) => {
  if (!ioInstance) return;
  ioInstance.to(rideId).emit(event, payload);
  if (riderId) ioInstance.to(riderId).emit(event, payload);
  if (driverId) ioInstance.to(driverId).emit(event, payload);
};

// Helper to verify if a user is part of a ride
async function isRideMember(userId: string, rideId: string): Promise<boolean> {
  const db = getDB();
  const ride = await db.get('SELECT userId, driverId FROM rides WHERE id = ?', [rideId]);
  return !!(ride && (ride.userId === userId || ride.driverId === userId));
}

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

    // Rider requests a ride — FIXED: only to drivers room, not global broadcast
    socket.on('request-ride', async (data: { userId: string; rideId: string }) => {
      if (!checkSocketRateLimit(`req-ride:${userId}`, 5, 60000)) {
        return socket.emit('error', { message: 'Too many ride requests. Please wait a minute.' });
      }
      if (data.userId !== userId) {
        return socket.emit('error', { message: 'Unauthorized request' });
      }
      const { rideId } = data;
      const db = getDB();

      // Find approved, online, available drivers — with location if possible
      const drivers = await db.all(
        'SELECT id, fullName FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ? AND isOnline = TRUE AND isAvailable = TRUE LIMIT 50',
        ['driver', 'motorist', 'approved']
      );

      if (drivers.length > 0) {
        // Only notify drivers room + admins, NOT all clients
        io.to('drivers').to('admins').emit('ride-requested', {
          rideId,
          riderId: userId,
          timestamp: new Date().toISOString(),
        });
        console.log(`🚕 Ride ${rideId} broadcast to ${drivers.length} drivers (drivers room only)`);
      } else {
        socket.emit('no-drivers-found', { message: 'No drivers available at the moment. Try again in a minute.' });
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
      try {
        // Guard: driver must not already have an active ride
        const active = await db.get(
          "SELECT id FROM rides WHERE driverId = ? AND status IN ('accepted','arrived','ongoing') LIMIT 1",
          [driverId]
        );
        if (active) {
          return socket.emit('error', { message: 'You already have an active ride. Complete it first.' });
        }

        const ride = await db.get('SELECT userId, status, expiresAt FROM rides WHERE id = ?', [rideId]);
        if (!ride) return socket.emit('error', { message: 'Ride not found.' });
        if (ride.status !== 'requested') return socket.emit('error', { message: 'Ride is no longer available.' });
        // Enforce request expiry — stale requests can't be accepted hours later.
        if (ride.expiresat || ride.expiresAt) {
          const expiry = new Date(ride.expiresat || ride.expiresAt);
          if (!isNaN(expiry.getTime()) && expiry < new Date()) {
            await db.run(
              "UPDATE rides SET status = 'cancelled', cancelledAt = CURRENT_TIMESTAMP WHERE id = ? AND status = 'requested'",
              [rideId]
            );
            return socket.emit('error', { message: 'This ride request has expired.' });
          }
        }
        const actualRiderId = ride.userId;

        const tx = await db.getTransactionClient();
        try {
          await tx.query('BEGIN');
          const updateRes = await tx.query(
            'UPDATE rides SET status = ?, driverId = ?, acceptedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
            ['accepted', driverId, rideId, 'requested']
          );
          if (updateRes.rowCount === 0) throw new Error('Ride is no longer available');
          await tx.query('UPDATE users SET isAvailable = FALSE WHERE id = ?', [driverId]);
          await tx.query('COMMIT');
          tx.release();
        } catch (e: any) {
          await tx.query('ROLLBACK');
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

      const db = getDB();
      try {
        // Update both users table (for admin live map) and driver_profiles (for rider tracking)
        await db.run('UPDATE users SET currentLat = ?, currentLng = ? WHERE id = ?', [lat, lng, userId]);
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
          console.log(`🏁 Ride ${rideId} marked as completed. Triggering settlement...`);
          const settlement = await settleRidePayment(rideId);
          if (settlement.success) {
            console.log(`💰 Settlement successful for ride ${rideId}`);
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

    // Chat logic
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
      if (socket.rooms.has(rideId)) {
        socket.to(rideId).emit('new-message', { ...message, senderId: userId });
      } else {
        socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🌐 User disconnected: ${userId} (${socket.id})`);
    });
  });
};
