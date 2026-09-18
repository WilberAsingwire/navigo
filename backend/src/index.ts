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
import supportRoutes from './routes/support';
import adminRoutes from './routes/admin';
import { initDB } from './config/database';
import { setupSocketHandlers, setIO } from './socket/socketHandler';
import { generalLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust Render's proxy to ensure HTTPS is detected correctly

const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!allowedOrigins) return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Request Logger — MUST be before routes to log API hits
app.use((req, _res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

// Google OAuth Strategy — optional, safe fallback
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || `${process.env.PUBLIC_BACKEND_URL || 'http://localhost:5000'}/auth/google/callback`;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallbackURL,
    },
    (_accessToken: any, _refreshToken: any, profile: any, done: any) => done(null, profile)
  ));
  console.log('✅ Google OAuth initialized →', googleCallbackURL);
} else {
  console.log('⚠️ Google OAuth disabled — missing GOOGLE_CLIENT_ID / SECRET');
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
      // User exists, redirect with status existing — include userId & role so the
      // frontend can land the user on the correct home page without an extra fetch.
      const token = require('./utils/auth').generateToken({ id: existingUser.id, role: existingUser.role });
      const params = new URLSearchParams({
        status: 'existing',
        token,
        userId: existingUser.id,
        name: existingUser.fullName || name,
        email: existingUser.email || email || '',
        role: existingUser.role || 'customer',
      }).toString();
      res.redirect(`${redirectUrl}?${params}`);
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
app.use('/api/admin', adminRoutes);
// Some screens (AdminAnalytics, AdminPayouts) still call the legacy /auth/admin/* path.
// Mount sub-routers for the specific endpoints that don't already exist under auth routes.
app.use('/api/auth/admin/payouts', adminRoutes);
app.use('/api/admin/analytics', adminRoutes);

app.get('/api/health', async (_req: any, res: any) => {
  try {
    const db = require('./config/database').getDB();
    await db.get('SELECT 1 as ok');
    res.json({ status: 'ok', name: 'NAVIGO API', db: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', name: 'NAVIGO API', db: 'disconnected' });
  }
});

// Socket.io — use same CORS allowlist as REST, with credentials
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins || '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
setIO(io);
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

// Initialize DB before starting the server
initDB().then(async () => {
  try {
    const db = require('./config/database').getDB();
    const { hashPassword } = require('./utils/auth');
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const adminPhone = process.env.ADMIN_PHONE || '0770000000'; // Valid Ugandan format for uniqueness

    if (!adminEmail) {
      console.log('⚠️ ADMIN_EMAIL not set — skipping admin auto-creation.');
    } else {
      const existingAdmin = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);
      if (!existingAdmin) {
        if (!process.env.ADMIN_PASSWORD) {
          console.error('❌ CRITICAL: ADMIN_PASSWORD not set — admin auto-creation aborted.');
        } else {
          const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD);
          const adminId = 'admin_' + Date.now();
          // Ensure phone is unique and valid format
          const existingPhone = await db.get('SELECT id FROM users WHERE phone = ?', [adminPhone]);
          const finalPhone = existingPhone ? `07${Math.floor(10000000 + Math.random() * 90000000)}` : adminPhone;
          await db.run(
            'INSERT INTO users (id, fullName, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [adminId, 'NAVIGO Admin', finalPhone, adminEmail, adminPassword, 'admin', true, 'approved', new Date().toISOString()]
          );
          await db.run(
            'INSERT INTO wallets (userId, balance) VALUES (?, 0) ON CONFLICT(userId) DO NOTHING',
            [adminId]
          );
          console.log(`🚀 NEW ADMIN CREATED: ${adminEmail} | ID: ${adminId} | Phone: ${finalPhone}`);
        }
      } else {
        console.log(`✅ Admin account exists: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error('❌ Critical failure setting up admin:', err);
  }

  httpServer.listen(PORT, () => console.log(`🚀 NAVIGO API on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`));
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
  process.exit(1);
});

// Global error handler — must be last
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err?.message);
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS: Origin not allowed' });
  }
  res.status(500).json({ message: 'Internal server error' });
});