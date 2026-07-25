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

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/google/callback'
  },
  (_a, _r, profile, done) => done(null, profile)
));

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false }), (_req, res) => {
  res.redirect('https://navigo-nu-eight.vercel.app/rider/home');
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const io = new Server(httpServer, { cors: { origin: '*' } });
io.on('connection', (s) => {
  s.on('join-chat', (d) => s.join(d.rideId));
  s.on('send-message', (d) => { s.to(d.rideId).emit('new-message', d.message); });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log('🚀 NAVIGO API on port ' + PORT));