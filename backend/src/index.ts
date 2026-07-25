import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS - Allow all origins for now
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'NAVIGO API', version: '1.0.0' });
});

// Socket.io
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const chatMessages: Record<string, any[]> = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  console.log('🔌 Connected:', userId);

  socket.on('join-chat', ({ rideId }) => socket.join(rideId));
  socket.on('load-messages', ({ rideId }, callback) => callback(chatMessages[rideId] || []));
  socket.on('send-message', ({ rideId, message }) => {
    if (!chatMessages[rideId]) chatMessages[rideId] = [];
    chatMessages[rideId].push(message);
    socket.to(rideId).emit('new-message', message);
  });
  socket.on('message-read', ({ messageId, rideId }) => socket.to(rideId).emit('message-read-confirmed', messageId));
  socket.on('typing', ({ rideId, userId: typingUserId, isTyping }) => socket.to(rideId).emit('user-typing', { userId: typingUserId, isTyping }));
  socket.on('disconnect', () => console.log('🔌 Disconnected:', userId));
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 NAVIGO API on port ${PORT}`));