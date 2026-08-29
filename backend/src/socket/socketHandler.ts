import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';
import { settleRidePayment } from '../utils/settlement';
import { verifyToken } from '../utils/auth';
import { normalizeVehicleType } from '../utils/fare';

let ioInstance: Server | null = null;

/** Called from index.ts so REST routes can emit socket events (e.g. cancellations). */
export const setIO = (io: Server) => { ioInstance = io; };

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

export const setupSocketHandlers = (io: Server) => {
  // ─── Authentication Middleware ──────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: Token is required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    // Attach user info to socket for use in handlers
    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.role;
    console.log(`🌐 User connected: ${userId} (${userRole}) | Socket: ${socket.id}`);

    // Join a room based on userId to receive targeted notifications
    socket.on('join', (userIdFromClient: string) => {
      // Security check: only allow joining your own room
      if (userIdFromClient !== userId) {
        return socket.emit('error', { message: 'Unauthorized: You can only join your own room' });
      }
      socket.join(userId);
      console.log(`👤 User ${userId} joined their private room`);
    });

    // Admins join a dedicated room so live-location broadcasts (which include
    // every online user's raw GPS coordinates) never reach riders/drivers —
    // previously this was sent with io.emit(), leaking every user's location
    // to any authenticated socket connection, admin or not.
    if (userRole === 'admin') {
      socket.join('admins');
    }

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

    // Rider requests a ride
    socket.on('request-ride', async (data: { userId: string; rideId: string }) => {
      // Security check: only the authenticated user can request a ride for themselves
      if (data.userId !== userId) {
        return socket.emit('error', { message: 'Unauthorized request' });
      }

      const { rideId } = data;
      const db = getDB();

      // Only dispatch to drivers whose registered vehicle actually matches
      // what the rider booked — previously every online+available driver
      // (any vehicle type) received every request, so a boda rider could get
      // matched with a car driver (and vice versa), and a driver's own
      // earnings/vehicle screens would show the wrong ride type entirely.
      const ride = await db.get('SELECT vehicleType FROM rides WHERE id = ?', [rideId]);
      const requestedType = normalizeVehicleType(ride?.vehicleType);

      // Find approved, online, and available drivers with a matching vehicle type
      const drivers = await db.all(
        `SELECT u.id, u.fullName, dp.vehicleType FROM users u
         LEFT JOIN driver_profiles dp ON dp.userId = u.id
         WHERE (u.role = ? OR u.role = ?) AND u.verificationStatus = ?
           AND u.isOnline = TRUE AND u.isAvailable = TRUE`,
        ['driver', 'motorist', 'approved']
      );
      const matchingDrivers = drivers.filter((d: any) => normalizeVehicleType(d.vehicleType) === requestedType);

      if (matchingDrivers.length > 0) {
        // Target only the actually-eligible drivers' personal rooms (joined via
        // the 'join' event) — this used to be io.emit(), which broadcast every
        // ride request (with the rider's id) to *every* connected socket,
        // including riders and offline/unavailable drivers.
        for (const d of matchingDrivers) {
          io.to(d.id).emit('ride-requested', {
            rideId,
            riderId: userId,
          });
        }
        console.log(`🚕 Broadcasted ${requestedType} ride ${rideId} to ${matchingDrivers.length} matching drivers`);
      } else {
        socket.emit('no-drivers-found', { message: 'No drivers available for this vehicle type at the moment.' });
      }
    });

    // Driver accepts a ride
    socket.on('accept-ride', async (data: { driverId: string; rideId: string; riderId: string }) => {
      const { driverId, rideId } = data;

      if (userRole !== 'driver' && userRole !== 'motorist') {
        return socket.emit('error', { message: 'Unauthorized: Only drivers can accept rides' });
      }
      if (driverId !== userId) {
        return socket.emit('error', { message: 'Unauthorized: Driver ID mismatch' });
      }

      const db = getDB();
      try {
        const ride = await db.get('SELECT userId FROM rides WHERE id = ?', [rideId]);
        if (!ride) {
          socket.emit('error', { message: 'Ride not found.' });
          return;
        }
        const actualRiderId = ride.userId;

        const tx = await db.getTransactionClient();
        try {
          await tx.query('BEGIN');
          const updateRes = await tx.query('UPDATE rides SET status = ?, driverId = ? WHERE id = ? AND status = ?', ['accepted', driverId, rideId, 'requested']);

          if (updateRes.rowCount === 0) {
            throw new Error('Ride is no longer available');
          }

          await tx.query('UPDATE users SET isAvailable = FALSE WHERE id = ?', [driverId]);
          await tx.query('COMMIT');
          tx.release();
        } catch (e: any) {
          await tx.query('ROLLBACK');
          tx.release();
          throw e;
        }

        io.to(actualRiderId).emit('ride-accepted', {
          rideId,
          driverId,
          message: 'Your driver has accepted the request!'
        });

        console.log(`✅ Ride ${rideId} accepted by Driver ${driverId}`);
      } catch (e: any) {
        console.error('Error accepting ride:', e);
        socket.emit('error', { message: e.message || 'Failed to accept ride.' });
      }
    });

    // Real-time location updates from Driver to Rider
    socket.on('update-location', async (data: { rideId: string; lat: number; lng: number; userId: string }) => {
      const { rideId, lat, lng, userId: clientUserId } = data;

      // Security check: only the authenticated user can update their location
      if (clientUserId !== userId) {
        return socket.emit('error', { message: 'Unauthorized location update' });
      }

      const db = getDB();
      try {
        await db.run('UPDATE users SET currentLat = ?, currentLng = ? WHERE id = ?', [lat, lng, userId]);

        socket.to(rideId).emit('location-updated', {
          lat,
          lng
        });

        // Scoped to admins only — this carries every driver/rider's raw GPS
        // position and must never reach other riders/drivers' sockets.
        io.to('admins').emit('admin-location-updated', {
          userId,
          lat,
          lng
        });
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

          // Free the driver back up for the next ride (only if they're still online).
          await db.run(
            'UPDATE users SET isAvailable = TRUE WHERE id = ? AND isOnline = TRUE',
            [userId]
          );
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

    // Load persisted chat history for a ride (frontend calls this with an ack callback).
    socket.on('load-messages', async (d: any, callback?: (messages: any[]) => void) => {
      const { rideId } = d;
      if (!(await isRideMember(userId, rideId))) {
        socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
        return callback?.([]);
      }
      try {
        const db = getDB();
        const rows = await db.all(
          'SELECT * FROM ride_messages WHERE rideId = ? ORDER BY createdAt ASC',
          [rideId]
        );
        const messages = rows.map((r: any) => ({
          id: r.id,
          text: r.text,
          senderId: r.senderId,
          senderName: r.senderName,
          senderRole: r.senderRole,
          timestamp: r.createdAt,
          status: r.status,
          type: r.type,
        }));
        callback?.(messages);
      } catch (e) {
        console.error('Error loading messages:', e);
        callback?.([]);
      }
    });

    socket.on('send-message', async (d: any) => {
      const { rideId, message } = d;
      if (await isRideMember(userId, rideId)) {
        const outgoing = { ...message, senderId: userId };
        socket.to(rideId).emit('new-message', outgoing);
        try {
          const db = getDB();
          await db.run(
            `INSERT INTO ride_messages (id, rideId, senderId, senderName, senderRole, text, type, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [message.id, rideId, userId, message.senderName, message.senderRole, message.text, message.type || 'text', 'sent']
          );
        } catch (e) {
          console.error('Error persisting message:', e);
        }
      } else {
        socket.emit('error', { message: 'Unauthorized: You are not part of this ride' });
      }
    });

    // Read receipts — the recipient acks a message, we mark it read and tell the sender.
    socket.on('message-read', async (d: any) => {
      const { messageId, rideId } = d;
      if (!(await isRideMember(userId, rideId))) return;
      try {
        const db = getDB();
        await db.run("UPDATE ride_messages SET status = 'read' WHERE id = ?", [messageId]);
        socket.to(rideId).emit('message-read-confirmed', messageId);
      } catch (e) {
        console.error('Error marking message read:', e);
      }
    });

    // Typing indicator — relayed live only, never persisted.
    socket.on('typing', async (d: any) => {
      const { rideId, isTyping } = d;
      if (!(await isRideMember(userId, rideId))) return;
      socket.to(rideId).emit('user-typing', { userId, isTyping: !!isTyping });
    });


    socket.on('disconnect', () => {
      console.log(`🌐 User disconnected: ${userId} (${socket.id})`);
    });
  });
};
