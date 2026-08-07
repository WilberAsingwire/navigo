import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';
import driverRoutes from './routes/drivers';
import userRoutes from './routes/users';
import { initDB } from './config/database';
import { setupSocketHandlers } from './socket/socketHandler';

dotenv.config();

const app = express();

const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Google OAuth Strategy - Now Optional to prevent crashing if IDs are missing
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: '/auth/google/callback'
    },
    (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
      return done(null, profile);
    }
  ));
  console.log('✅ Google OAuth Strategy initialized');
} else {
  console.log('⚠️ Google Client ID missing. Google Login disabled.');
}

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email', 'phone'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req: any, res) => {
    const user = req.user;
    const name = user?.displayName || 'Google User';
    const email = user?.emails?.[0]?.value || '';
    const googleId = user?.id || '';

    const db = require('./config/database').getDB();
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ? OR (socialProvider = ? AND socialId = ?)',
      [email.toLowerCase().trim(), 'google', googleId]
    );

    const redirectUrl = process.env.REDIRECT_URL || 'https://navigo-nu-eight.vercel.app/auth/callback';

    if (existingUser) {
      // User exists, redirect with status existing
      const token = require('./utils/auth').generateToken({ id: existingUser.id, role: existingUser.role });
      res.redirect(`${redirectUrl}?status=existing&token=${token}`);
    } else {
      // New user, redirect with status new and their info
      const params = new URLSearchParams({
        status: 'new',
        name,
        email,
        socialId: googleId,
        provider: 'google'
      }).toString();
      res.redirect(`${redirectUrl}?${params}`);
    }
  }
);

// Regular routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok', name: 'NAVIGO API' }));

// Socket.io
const io = new Server(httpServer, { cors: { origin: '*' } });
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

// Initialize DB before starting the server
initDB().then(() => {
  httpServer.listen(PORT, () => console.log('NAVIGO API on port ' + PORT));
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
});