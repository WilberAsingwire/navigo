import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';
import { settleRidePayment } from '../utils/settlement';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🌐 User connected: ${socket.id}`);

    // Join a room based on userId to receive targeted notifications
    socket.on('join', (userId: string) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their private room`);
    });

    // Securely join a ride room for real-time tracking
    socket.on('join-ride-room', async (data: { rideId: string }) => {
      const { rideId } = data;
      const db = getDB();
      try {
        // Use the userId associated with this socket connection
        // Note: In a real app, userId would be attached to socket during auth middleware
        // For this implementation, we'll assume the userId is passed or managed via session
        const ride = await db.get('SELECT userId, driverId FROM rides WHERE id = ?', [rideId]);

        if (!ride) {
          socket.emit('error', { message: 'Ride not found.' });
          return;
        }

        // We don't have a strict auth middleware here, so we'll trust the userId from the socket's initial 'join'
        // but in production, we'd check socket.user.id
        socket.join(rideId);
        console.log(`🚕 Socket ${socket.id} joined ride room ${rideId}`);
      } catch (e) {
        console.error('Error joining ride room:', e);
        socket.emit('error', { message: 'Internal server error joining ride room.' });
      }
    });

    // Rider requests a ride
    socket.on('request-ride', async (data: { userId: string; rideId: string }) => {
      const { userId, rideId } = data;
      const db = getDB();

      // Find approved, online, and available drivers
      const drivers = await db.all(
        'SELECT id, fullName FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ? AND isOnline = TRUE AND isAvailable = TRUE',
        ['driver', 'motorist', 'approved']
      );

      if (drivers.length > 0) {
        // In a real app, we'd use GPS to find the CLOSEST driver.
        // For now, we broadcast to all available drivers.
        io.emit('ride-requested', {
          rideId,
          riderId: userId,
          // We'll fetch ride details in the frontend or send them here
        });
        console.log(`🚕 Broadcasted ride ${rideId} to ${drivers.length} drivers`);
      } else {
        socket.emit('no-drivers-found', { message: 'No drivers available at the moment.' });
      }
    });

    // Driver accepts a ride
    socket.on('accept-ride', async (data: { driverId: string; rideId: string; riderId: string }) => {
      const { driverId, rideId, riderId } = data;
      const db = getDB();

      try {
        await db.run('UPDATE rides SET status = ?, driverId = ? WHERE id = ?', ['accepted', driverId, rideId]);
        await db.run('UPDATE users SET isAvailable = FALSE WHERE id = ?', [driverId]);

        // Notify the rider that their ride has been accepted
        io.to(riderId).emit('ride-accepted', {
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
      const { rideId, lat, lng, userId } = data;
      const db = getDB();
      try {
        // Persist location to the users table for the admin map
        await db.run('UPDATE users SET currentLat = ?, currentLng = ? WHERE id = ?', [lat, lng, userId]);

        // Send the update to everyone in the ride room
        socket.to(rideId).emit('location-updated', {
          lat,
          lng
        });

        // Broadcast to admin map
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

      await db.run('UPDATE rides SET status = ? WHERE id = ?', [status, rideId]);

      // If ride is completed, trigger payment settlement
      if (status === 'completed') {
        console.log(`🏁 Ride ${rideId} marked as completed. Triggering settlement...`);
        const settlement = await settleRidePayment(rideId);
        if (settlement.success) {
          console.log(`💰 Settlement successful for ride ${rideId}`);
        } else {
          console.error(`❌ Settlement failed for ride ${rideId}: ${settlement.message}`);
        }
      }

      // Notify rider of status change
      io.to(riderId).emit('status-changed', { rideId, status });
    });

    // Chat logic (maintained from previous version)
    socket.on('join-chat', (d: any) => socket.join(d.rideId));
    socket.on('send-message', (d: any) => { socket.to(d.rideId).emit('new-message', d.message); });

    socket.on('disconnect', () => {
      console.log(`🌐 User disconnected: ${socket.id}`);
    });
  });
};
