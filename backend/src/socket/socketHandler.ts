import { Server, Socket } from 'socket.io';
import { getDB } from '../config/database';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🌐 User connected: ${socket.id}`);

    // Join a room based on userId to receive targeted notifications
    socket.on('join', (userId: string) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their private room`);
    });

    // Rider requests a ride
    socket.on('request-ride', async (data: { userId: string; rideId: string }) => {
      const { userId, rideId } = data;
      const db = getDB();

      // Find approved, online, and available drivers
      const drivers = await db.all(
        'SELECT id, name FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ? AND isOnline = 1 AND isAvailable = 1',
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
        await db.run('UPDATE users SET isAvailable = 0 WHERE id = ?', [driverId]);

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
    socket.on('update-location', (data: { rideId: string; lat: number; lng: number }) => {
      // Send the update to everyone in the ride room
      socket.to(data.rideId).emit('location-updated', {
        lat: data.lat,
        lng: data.lng
      });
    });

    // Ride status updates (arrived, started, completed)
    socket.on('update-status', async (data: { rideId: string; riderId: string; status: string }) => {
      const { rideId, riderId, status } = data;
      const db = getDB();

      await db.run('UPDATE rides SET status = ? WHERE id = ?', [status, rideId]);

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
