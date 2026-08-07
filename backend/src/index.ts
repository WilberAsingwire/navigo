import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';
import { initDB } from './config/database';

dotenv.config();

const app = express();

const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/auth/google/callback'
  },
  (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
    return done(null, profile);
  }
));

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email', 'phone'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: any, res) => {
    const user = req.user;
    const name = user?.displayName || 'Google User';
    const email = user?.emails?.[0]?.value || '';
    const googleId = user?.id || '';

    // Redirect to frontend with user data
    const params = new URLSearchParams({
      name,
      email,
      socialId: googleId,
      provider: 'google'
    }).toString();

    const redirectUrl = process.env.REDIRECT_URL || 'https://navigo-nu-eight.vercel.app/auth/callback';
    res.redirect(`${redirectUrl}?${params}`);
  }
);

// Regular routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok', name: 'NAVIGO API' }));

// Socket.io
const io = new Server(httpServer, { cors: { origin: '*' } });
io.on('connection', (s: any) => {
  s.on('join-chat', (d: any) => s.join(d.rideId));
  s.on('send-message', (d: any) => { s.to(d.rideId).emit('new-message', d.message); });
});

const PORT = process.env.PORT || 5000;

// Initialize DB before starting the server
initDB().then(() => {
  httpServer.listen(PORT, () => console.log('NAVIGO API on port ' + PORT));
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
});
