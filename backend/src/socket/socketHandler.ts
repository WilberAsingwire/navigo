import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';
import { settleRidePayment } from '../utils/settlement';
import { verifyToken } from '../utils/auth';

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

      // Find approved, online, and available drivers
      const drivers = await db.all(
        'SELECT id, fullName FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ? AND isOnline = TRUE AND isAvailable = TRUE',
        ['driver', 'motorist', 'approved']
      );

      if (drivers.length > 0) {
        io.emit('ride-requested', {
          rideId,
          riderId: userId,
        });
        console.log(`🚕 Broadcasted ride ${rideId} to ${drivers.length} drivers`);
      } else {
        socket.emit('no-drivers-found', { message: 'No drivers available at the moment.' });
      }
    });

    // Driver accepts a ride
    socket.on('accept-ride', async (data: { driverId: string; rideId: string; riderId: string }) => {
      const { driverId, rideId } = data;

      // Security check: must be a driver/motorist and must be themselves
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

        await db.run('UPDATE rides SET status = ?, driverId = ? WHERE id = ?', ['accepted', driverId, rideId]);
        await db.run('UPDATE users SET isAvailable = FALSE WHERE id = ?', [driverId]);

        io.to(actualRiderId).emit('ride-accepted', {
          rideId,
          driverId,
          message: 'Your driver has accepted the request!'
        });

        console.log(`✅ Ride ${rideId} accepted by Driver ${driverId}`);
      } catch (e) {
        console.error('Error accepting ride:', e);
        socket.emit('error', { message: 'Failed to accept ride.' });
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

        io.emit('admin-location-updated', {
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
      const { rideId, riderId, status } = data;
      const db = getDB();

      try {
        const ride = await db.get('SELECT driverId FROM rides WHERE id = ?', [rideId]);
        if (!ride || ride.driverId !== userId) {
          return socket.emit('error', { message: 'Unauthorized: Only the assigned driver can update status' });
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

        io.to(riderId).emit('status-changed', { rideId, status });
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
      if (await isRideMember(userId, rideId)) {
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
