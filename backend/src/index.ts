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
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'NAVIGO API', version: '1.0.0' });
});

// ─── Chat Storage (in-memory) ─────────────────────
const chatMessages: Record<string, any[]> = {};

// ─── Socket.io ────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  const userRole = socket.handshake.query.role as string;
  
  console.log(`🔌 Connected: ${userId} (${userRole})`);

  // Join a chat room for a specific ride
  socket.on('join-chat', ({ rideId }) => {
    socket.join(rideId);
    console.log(`💬 ${userId} joined chat: ${rideId}`);
  });

  // Load previous messages
  socket.on('load-messages', ({ rideId }, callback) => {
    const messages = chatMessages[rideId] || [];
    callback(messages);
  });

  // Send a message
  socket.on('send-message', ({ rideId, message }) => {
    if (!chatMessages[rideId]) {
      chatMessages[rideId] = [];
    }
    chatMessages[rideId].push(message);
    
    // Keep only last 100 messages
    if (chatMessages[rideId].length > 100) {
      chatMessages[rideId] = chatMessages[rideId].slice(-100);
    }

    // Broadcast to everyone in the ride room EXCEPT sender
    socket.to(rideId).emit('new-message', message);
    console.log(`📨 Message in ${rideId}: ${message.text.substring(0, 30)}...`);
  });

  // Message read receipt
  socket.on('message-read', ({ messageId, rideId }) => {
    socket.to(rideId).emit('message-read-confirmed', messageId);
  });

  // Typing indicator
  socket.on('typing', ({ rideId, userId: typingUserId, isTyping }) => {
    socket.to(rideId).emit('user-typing', { 
      userId: typingUserId, 
      isTyping 
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${userId}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 NAVIGO server running on http://localhost:${PORT}`);
  console.log(`💬 Chat server ready`);
});

export { io };