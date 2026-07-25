import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/google/callback'
  },
  (_accessToken, _refreshToken, profile, done) => {
    return done(null, profile);
  }
));

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false }), (_req, res) => {
  res.redirect(process.env.FRONTEND_URL || 'https://navigo-nu-eight.vercel.app/rider/home');
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', name: 'NAVIGO API', version: '1.0.0' }));

const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const chatMessages: Record<string, any[]> = {};

io.on('connection', (socket) => {
  socket.on('join-chat', ({ rideId }) => socket.join(rideId));
  socket.on('load-messages', ({ rideId }, cb) => cb(chatMessages[rideId] || []));
  socket.on('send-message', ({ rideId, message }) => {
    if (!chatMessages[rideId]) chatMessages[rideId] = [];
    chatMessages[rideId].push(message);
    socket.to(rideId).emit('new-message', message);
  });
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 NAVIGO API on port ${PORT}`));