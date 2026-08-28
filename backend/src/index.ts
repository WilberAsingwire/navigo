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
import walletRoutes from './routes/wallet';
import poiRoutes from './routes/poi';
import { initDB } from './config/database';
import { setupSocketHandlers } from './socket/socketHandler';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust Render's proxy to ensure HTTPS is detected correctly

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

    const redirectUrl = process.env.REDIRECT_URL || 'https://navigo-five.vercel.app/auth/callback';

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
app.use('/api/wallet', walletRoutes);
app.use('/api/poi', poiRoutes);

app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok', name: 'NAVIGO API' }));

// Request Logger - This tells us exactly what is hitting the server
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});


// Socket.io
const io = new Server(httpServer, { cors: { origin: '*' } });
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

// Initialize DB before starting the server
initDB().then(async () => {
  try {
    const db = require('./config/database').getDB();
    const { hashPassword } = require('./utils/auth');

    const adminEmail = 'navigouganda@gmail.com';

    // Check if admin already exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

    if (!existingAdmin) {
      const adminPassword = await hashPassword('Kakumiro222');
      const adminId = 'admin_' + Date.now();
      await db.run(
        'INSERT INTO users (id, fullName, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [adminId, 'NAVIGO Admin', 'admin_' + adminId, adminEmail, adminPassword, 'admin', 1, 'approved', new Date().toISOString()]
      );
      console.log(`🚀 NEW ADMIN CREATED: ${adminEmail} | ID: ${adminId}`);
    } else {
      console.log(`✅ Admin account already exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error('❌ Critical failure setting up admin:', err);
  }

  httpServer.listen(PORT, () => console.log('NAVIGO API on port ' + PORT));
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
});