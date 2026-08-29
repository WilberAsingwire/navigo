// dotenv must be configured before any other module reads process.env at import time.
// NOTE: ES module `import` statements are hoisted and evaluated in dependency order
// BEFORE any top-level statements in this file run (even ones written earlier in the
// file, like a bare `dotenv.config()` call). To guarantee env vars are loaded first,
// the loading itself must happen inside an imported module.
import './config/loadEnv';

import express from 'express';
import cors from 'cors';
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
import supportRoutes from './routes/support';
import loyaltyRoutes from './routes/loyalty';
import { initDB, getDB } from './config/database';
import { setupSocketHandlers, setIO } from './socket/socketHandler';
import { generalLimiter } from './middleware/rateLimit';
import { generateToken, hashPassword } from './utils/auth';

const app = express();
app.set('trust proxy', 1); // Trust Render's proxy to ensure HTTPS is detected correctly

const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : null;
app.use(cors({
  origin: (origin, callback) => {
    // If ALLOWED_ORIGINS is not set, allow all origins (safe default for deployment)
    if (!allowedOrigins) {
      return callback(null, true);
    }
    // Otherwise, only allow origins in the list (or requests with no origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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

    const db = getDB();
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ? OR (socialProvider = ? AND socialId = ?)',
      [email.toLowerCase().trim(), 'google', googleId]
    );

    const redirectUrl = process.env.REDIRECT_URL || 'https://navigo-five.vercel.app/auth/callback';

    if (existingUser) {
      // User exists, redirect with status existing
      const token = generateToken({ id: existingUser.id, role: existingUser.role });
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
app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/loyalty', loyaltyRoutes);

app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok', name: 'NAVIGO API' }));

// Request Logger - This tells us exactly what is hitting the server
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});


// Socket.io
const io = new Server(httpServer, { cors: { origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*' } });
setIO(io);
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

// Initialize DB before starting the server
initDB().then(async () => {
  try {
    const db = getDB();

    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.log('⚠️ ADMIN_EMAIL not set in environment. Skipping admin auto-creation.');
    } else {
      // Check if admin already exists
      const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

      if (!existingAdmin) {
        if (!process.env.ADMIN_PASSWORD) {
  console.error('❌ CRITICAL: ADMIN_PASSWORD not set in environment. Admin auto-creation aborted.');
  return;
}
const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD);
        const adminId = 'admin_' + Date.now();
        await db.run(
          'INSERT INTO users (id, fullName, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [adminId, 'NAVIGO Admin', 'admin_' + adminId, adminEmail, adminPassword, 'admin', true, 'approved', new Date().toISOString()]
        );
        console.log(`🚀 NEW ADMIN CREATED: ${adminEmail} | ID: ${adminId}`);
      } else {
        console.log(`✅ Admin account already exists: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error('❌ Critical failure setting up admin:', err);
  }

  httpServer.listen(PORT, () => console.log('NAVIGO API on port ' + PORT));
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
});