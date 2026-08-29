import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';
import { authLimiter, smsLimiter } from '../middleware/rateLimit';
import { normalizeVehicleType } from '../utils/fare';

const router = express.Router();

// ─── Types ───────────────────────────────────────────
type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

interface DriverDocs {
  nationalId?: string;
  drivingLicense?: string;
  vehiclePhoto?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  selfieWithVehicle?: string;
}

interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  role: 'rider' | 'driver' | 'admin';
  phoneVerified: boolean;
  verificationStatus: VerificationStatus;
  driverDocs?: DriverDocs;
  rejectionReason?: string;
  socialProvider?: 'google' | 'facebook' | 'github';
  socialId?: string;
  createdAt: Date;
}

// ─── Helper ──────────────────────────────────────────
const sanitizeUser = (user: any) => {
  const { password, ...clean } = user;
  return clean;
};

const normalizePhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('256')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

// ─── REGISTER ────────────────────────────────────────
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { fullName, phone, password, email, role, referralCode } = req.body;
    const db = getDB();

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone.match(/^07\d{8}$/)) {
      return res.status(400).json({
        message: 'Invalid phone number. Please use format 07... (e.g. 0772000000)'
      });
    }

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const validRoles = ['rider', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    const existingPhone = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered. Please login.' });
    }

    // Fix: Ensure empty strings are treated as null/missing for unique checks
    const processedEmail = (email && email.trim()) ? email.toLowerCase().trim() : null;
    if (processedEmail) {
      const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', [processedEmail]);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered.' });
      }
    }

    const userRole = role || 'rider';
    const needsVerification = userRole === 'driver';
    const hashedPassword = await hashPassword(password);

    const userId = `user_${Math.random().toString(36).substr(2, 9)}${Date.now()}`;
    // Every user gets a stable, unique referral code they can actually
    // share — previously the app showed everyone the same hardcoded
    // "NAVIGO50" code, which isn't a real referral link to anyone.
    const newReferralCode = `NAVIGO${userId.slice(-5).toUpperCase()}`;

    // Resolve the referrer (if a valid code from someone else was supplied) —
    // referral points are only ever credited once that friend completes
    // their first ride (see /rides/request), never just for signing up.
    let referrer: any = null;
    if (referralCode && typeof referralCode === 'string' && referralCode.trim()) {
      referrer = await db.get('SELECT id FROM users WHERE referralCode = ?', [referralCode.trim().toUpperCase()]);
    }

    const newUser: any = {
      id: userId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: processedEmail,
      password: hashedPassword,
      role: userRole,
      phoneVerified: true,
      verificationStatus: needsVerification ? 'unverified' : 'approved',
      createdAt: new Date().toISOString(),
      referralCode: newReferralCode,
      referredBy: referrer?.id || null,
    };

    try {
      await db.run(
        'INSERT INTO users (id, fullName, phone, email, password, role, phoneVerified, verificationStatus, createdAt, referralCode, referredBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newUser.id, newUser.fullName, newUser.phone, newUser.email, newUser.password, newUser.role, newUser.phoneVerified, newUser.verificationStatus, newUser.createdAt, newUser.referralCode, newUser.referredBy]
      );
      if (referrer?.id) {
        await db.run(
          'INSERT INTO referrals (id, referrerId, referredUserId) VALUES (?, ?, ?)',
          [`ref_${Date.now()}_${userId}`, referrer.id, userId]
        );
      }
    } catch (dbError: any) {
      console.error('DATABASE INSERT ERROR:', dbError);
      return res.status(500).json({
        message: 'Database insertion failed',
        detail: dbError.detail,
        error: dbError.message
      });
    }

    const token = generateToken({ id: newUser.id, role: newUser.role });
    const message = needsVerification
      ? `Welcome, ${newUser.fullName}! Please upload your documents for verification.`
      : `Welcome to NAVIGO, ${newUser.fullName}! 🚀`;

    res.status(201).json({ message, user: sanitizeUser(newUser), token });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Registration failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: error.detail // PostgreSQL often puts the specific error here
    });
  }
});

// ─── LOGIN ───────────────────────────────────────────
router.post('/login', authLimiter, async (req: Request, res: Response) => {
// ... existing login logic ...
  try {
    const { identifier, password } = req.body;
    const db = getDB();

    let user;
    console.log(`🔑 Login attempt for identifier: ${identifier}`);
    if (identifier.includes('@')) {
      // Login with email
      user = await db.get('SELECT * FROM users WHERE email = ?', [identifier.toLowerCase().trim()]);
      console.log(`Searching by email. User found: ${!!user}`);
    } else {
      // Login with phone
      const cleanPhone = normalizePhone(identifier);
      user = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
      console.log(`Searching by phone (${cleanPhone}). User found: ${!!user}`);
    }

    if (!user) {
      console.log(`❌ Login failed: No user found with identifier ${identifier}`);
      return res.status(401).json({ message: 'Invalid credentials. Please check your email/phone or password.' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    console.log(`Password check for user ${user.id}: ${passwordMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your email/phone or password.' });
    }

    let message = `Welcome back, ${user.fullName}!`;
    if (user.verificationStatus === 'pending') {
      message += ' Your documents are under review.';
    } else if (user.verificationStatus === 'rejected') {
      message += ` Verification rejected: ${user.rejectionReason || 'Please re-upload documents.'}`;
    } else if (user.verificationStatus === 'unverified' && user.role === 'driver') {
      message += ' Please upload your documents to start driving.';
    }

    res.json({ message, user: sanitizeUser(user), token: generateToken({ id: user.id, role: user.role }) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.' });
  }
});

// ─── SOCIAL REGISTRATION ──────────────────────────
router.post('/google-register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, socialId, provider } = req.body;
    const db = getDB();

    if (!phone) return res.status(400).json({ message: 'Phone number is required for registration.' });
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone.match(/^07\d{8}$/)) {
      return res.status(400).json({ message: 'Invalid phone number. Format: 0772000000' });
    }

    const existingPhone = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered. Please login.' });
    }

    const userId = 'user_' + Date.now();
    const newUser: any = {
      id: userId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : null,
      role: 'rider',
      phoneVerified: true,
      verificationStatus: 'approved',
      socialProvider: provider,
      socialId: socialId,
      createdAt: new Date().toISOString()
    };

    await db.run(
      'INSERT INTO users (id, fullName, phone, email, role, phoneVerified, verificationStatus, socialProvider, socialId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newUser.id, newUser.fullName, newUser.phone, newUser.email, newUser.role, newUser.phoneVerified, newUser.verificationStatus, newUser.socialProvider, newUser.socialId, newUser.createdAt]
    );

    const token = generateToken({ id: newUser.id, role: newUser.role });
    res.json({ message: 'Registration successful!', user: sanitizeUser(newUser), token });
  } catch (error) {
    console.error('Google register error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ─── UPLOAD DRIVER DOCUMENTS ─────────────────────────
router.post('/upload-documents', async (req: Request, res: Response) => {
  try {
    const { userId, nationalId, drivingLicense, vehiclePhoto, vehiclePlate, vehicleModel, vehicleColor, selfieWithVehicle, vehicleType, isFemaleDriver } = req.body;
    const db = getDB();

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'driver' && user.role !== 'motorist') {
      return res.status(400).json({ message: 'Only drivers and motorists can upload documents.' });
    }

    if (!drivingLicense) {
      return res.status(400).json({ message: 'Driving license is required.' });
    }
    if (!vehiclePlate) {
      return res.status(400).json({ message: 'Vehicle plate number is required.' });
    }
    if (!vehicleType) {
      return res.status(400).json({ message: 'Vehicle type is required.' });
    }

    // Store the canonical vehicle type ("standard" from the onboarding form
    // and "go" from the rider app both mean "economy") so ride matching and
    // fare calculation always agree with what's on file for this driver.
    const normalizedVehicleType = normalizeVehicleType(vehicleType);

    const driverDocs = JSON.stringify({
      nationalId,
      drivingLicense,
      vehiclePhoto,
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      vehicleColor,
      selfieWithVehicle
    });

    // 1. Update user verification status and docs (isFemaleDriver is now
    // persisted server-side — previously it was only ever written to
    // localStorage on the submitting device, so it silently reset to false
    // for the driver on every fresh login/new device and was never visible
    // to admins reviewing the driver in AdminApprovals).
    await db.run(
      'UPDATE users SET driverDocs = ?, verificationStatus = ?, isFemaleDriver = ? WHERE id = ?',
      [driverDocs, 'pending', !!isFemaleDriver, userId]
    );

    // 2. Upsert driver profile with vehicle type, plate, model and color
    await db.run(
      `INSERT INTO driver_profiles (userId, vehicleType, plate, model, color)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (userId) DO UPDATE SET vehicleType = EXCLUDED.vehicleType, plate = EXCLUDED.plate,
         model = EXCLUDED.model, color = EXCLUDED.color`,
      [userId, normalizedVehicleType, vehiclePlate.toUpperCase(), vehicleModel || null, vehicleColor || null]
    );

    res.json({
      message: 'Documents uploaded! Admin will review within 24-48 hours.',
      user: { ...user, driverDocs: JSON.parse(driverDocs), verificationStatus: 'pending' }
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ message: 'Upload failed.' });
  }
});

// ─── ADMIN: GET ALL USERS ────────────────────────────
router.get('/admin/users', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const users = await db.all('SELECT * FROM users');
    res.json(users.map(sanitizeUser));
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// ─── ADMIN: GET DASHBOARD STATS ────────────────────────────
router.get('/admin/stats', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();

    const [totalUsers] = await db.all('SELECT COUNT(*) as count FROM users');
    const [totalDrivers] = await db.all("SELECT COUNT(*) as count FROM users WHERE role = 'driver'");
    const [totalMotorists] = await db.all("SELECT COUNT(*) as count FROM users WHERE role = 'motorist'");
    const [activeRides] = await db.all("SELECT COUNT(*) as count FROM rides WHERE status NOT IN ('completed', 'cancelled')");
    // NAVIGO's actual revenue is the commission ledger, accrued on every completed
    // ride (cash or wallet) — see settleRidePayment(). "Today" = since local midnight.
    const [revenue] = await db.all(
      "SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE kind = 'commission' AND createdAt >= CURRENT_DATE"
    );
    const [avgRating] = await db.all('SELECT AVG(rating) as avg FROM driver_profiles');
    const [pending] = await db.all("SELECT COUNT(*) as count FROM users WHERE verificationStatus = 'pending'");
    const [openTickets] = await db.all("SELECT COUNT(*) as count FROM support_tickets WHERE status != 'resolved'");

    res.json({
      totalUsers: totalUsers?.count || 0,
      totalDrivers: totalDrivers?.count || 0,
      totalMotorists: totalMotorists?.count || 0,
      activeRides: activeRides?.count || 0,
      revenue: revenue?.total || 0,
      avgRating: parseFloat(avgRating?.avg || '0').toFixed(1),
      pendingApprovals: pending?.count || 0,
      supportTickets: openTickets?.count || 0,
      disputes: 0, // No dispute-tracking table exists yet — left at 0 rather than a fake number.
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ─── ADMIN: VERIFY DRIVER ────────────────────────────
router.post('/admin/verify-driver', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { driverId, action, reason } = req.body;
    const db = getDB();

    const driver = await db.get('SELECT * FROM users WHERE id = ?', [driverId]);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (action === 'approve') {
      await db.run('UPDATE users SET verificationStatus = ?, rejectionReason = NULL WHERE id = ?', ['approved', driverId]);
      res.json({ message: `${driver.fullName} has been approved!` });
    } else if (action === 'reject') {
      await db.run('UPDATE users SET verificationStatus = ?, rejectionReason = ? WHERE id = ?', ['rejected', reason || 'Documents not satisfactory.', driverId]);
      res.json({ message: `${driver.fullName} has been rejected. Reason: ${reason || 'Documents not satisfactory.'}` });
    } else {
      res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Verification failed.' });
  }
});

// ─── ADMIN: UPDATE USER STATUS ──────────────────────
router.post('/admin/update-user-status', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, status } = req.body;
    const validStatuses = ['active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const db = getDB();
    await db.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    res.json({ message: `User status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// ─── ADMIN: DELETE USER ──────────────────────
router.delete('/admin/user/:id', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ─── ADMIN: LIVE LOCATIONS ──────────────────
// ─── ADMIN: 7-DAY REVENUE TREND (for the dashboard chart) ──
router.get('/admin/revenue-trend', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all(
      `SELECT DATE(createdAt) as day, COALESCE(SUM(amount), 0) as total
       FROM wallet_transactions
       WHERE kind = 'commission' AND createdAt >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(createdAt)
       ORDER BY day ASC`
    );

    const byDay: Record<string, number> = {};
    for (const r of rows) byDay[new Date(r.day).toISOString().slice(0, 10)] = Number(r.total);

    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), amount: byDay[key] || 0 });
    }

    res.json({ days });
  } catch (error) {
    console.error('Revenue trend error:', error);
    res.status(500).json({ message: 'Failed to fetch revenue trend' });
  }
});

// ─── ADMIN: PLATFORM SETTINGS ────────────────────────
const DEFAULT_SETTINGS = {
  appName: 'NAVIGO',
  currency: 'UGX',
  supportPhone: '+256 800 100 200',
  supportEmail: 'support@navigo.ug',
  driverCommission: '10',
  bodaBaseFare: '800',
  carBaseFare: '1500',
  comfortBaseFare: '2500',
  xlBaseFare: '4000',
  autoApproveDrivers: 'false',
  maintenanceMode: 'false',
};

router.get('/admin/settings', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all('SELECT key, value FROM platform_settings');
    const stored: Record<string, string> = {};
    for (const r of rows) stored[r.key] = r.value;
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    res.json({
      ...merged,
      autoApproveDrivers: merged.autoApproveDrivers === 'true',
      maintenanceMode: merged.maintenanceMode === 'true',
    });
  } catch (error) {
    console.error('Admin settings fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

router.put('/admin/settings', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);
    const updates = Object.entries(req.body || {}).filter(([k]) => allowedKeys.includes(k));

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid settings provided.' });
    }

    for (const [key, value] of updates) {
      await db.run(
        `INSERT INTO platform_settings (key, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updatedAt = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }

    res.json({ message: 'Settings saved.' });
  } catch (error) {
    console.error('Admin settings save error:', error);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

// ─── ADMIN: LIST DRIVER PAYOUTS (for manual/no-gateway processing) ──
router.get('/admin/payouts', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const status = req.query.status as string | undefined;

    let query = `
      SELECT p.*, u.fullName
      FROM payouts p
      LEFT JOIN users u ON u.id = p.userId
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE p.status = ?';
      params.push(status);
    }
    query += ' ORDER BY p.createdAt DESC LIMIT 100';

    const payouts = await db.all(query, params);
    res.json({ payouts });
  } catch (error) {
    console.error('Admin payouts list error:', error);
    res.status(500).json({ message: 'Failed to fetch payouts' });
  }
});

// ─── ADMIN: MARK A PAYOUT AS PAID (manual/no-gateway flow) ──
router.post('/admin/payouts/:id/complete', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const db = getDB();

    const payout = await db.get('SELECT * FROM payouts WHERE id = ?', [id]);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });
    if (payout.status === 'completed') {
      return res.status(400).json({ message: 'This payout is already marked as completed.' });
    }

    await db.run(
      "UPDATE payouts SET status = 'completed', note = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [note || payout.note, id]
    );

    res.json({ message: 'Payout marked as paid.' });
  } catch (error) {
    console.error('Admin payout complete error:', error);
    res.status(500).json({ message: 'Failed to update payout' });
  }
});

// ─── ADMIN: ANALYTICS — SUMMARY KPIs ────────────────
router.get('/admin/analytics/summary', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();

    const [totalRides] = await db.all("SELECT COUNT(*) as count FROM rides WHERE status = 'completed'");
    // NAVIGO's revenue is the commission ledger (see settleRidePayment) — same
    // metric used on the main dashboard, just all-time here rather than "today".
    const [totalRevenue] = await db.all("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE kind = 'commission'");
    const [activeDrivers] = await db.all("SELECT COUNT(*) as count FROM users WHERE role IN ('driver','motorist') AND isOnline = TRUE");
    const [avgRating] = await db.all('SELECT AVG(rating) as avg FROM driver_profiles');

    // Month-over-month growth in completed rides. If there were zero rides
    // last month, growth is undefined — reported as 0 rather than Infinity/NaN.
    const [thisMonth] = await db.all(
      "SELECT COUNT(*) as count FROM rides WHERE status = 'completed' AND requestedAt >= DATE_TRUNC('month', CURRENT_DATE)"
    );
    const [lastMonth] = await db.all(
      "SELECT COUNT(*) as count FROM rides WHERE status = 'completed' AND requestedAt >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND requestedAt < DATE_TRUNC('month', CURRENT_DATE)"
    );
    const thisCount = Number(thisMonth?.count || 0);
    const lastCount = Number(lastMonth?.count || 0);
    const monthlyGrowth = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : (thisCount > 0 ? 100 : 0);

    res.json({
      totalRides: Number(totalRides?.count || 0),
      totalRevenue: Number(totalRevenue?.total || 0),
      activeDrivers: Number(activeDrivers?.count || 0),
      avgRating: parseFloat(avgRating?.avg || '0').toFixed(1),
      monthlyGrowth,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
});

// ─── ADMIN: ANALYTICS — DAILY RIDE VOLUME (last 14 days) ──
router.get('/admin/analytics/daily', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all(
      `SELECT DATE(requestedAt) as day, COUNT(*) as count
       FROM rides
       WHERE requestedAt >= CURRENT_DATE - INTERVAL '13 days'
       GROUP BY DATE(requestedAt)
       ORDER BY day ASC`
    );
    const byDay: Record<string, number> = {};
    for (const r of rows) byDay[new Date(r.day).toISOString().slice(0, 10)] = Number(r.count);

    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay[key] || 0 });
    }
    res.json(days);
  } catch (error) {
    console.error('Analytics daily error:', error);
    res.status(500).json({ message: 'Failed to fetch daily ride volume' });
  }
});

// ─── ADMIN: ANALYTICS — TOP PERFORMING DRIVERS ──────
router.get('/admin/analytics/top-drivers', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all(
      `SELECT u.id, u.fullName, u.city, dp.vehicleType,
              COUNT(r.id) FILTER (WHERE r.status = 'completed') as "completedRides",
              COALESCE(SUM(wt.amount) FILTER (WHERE wt.kind IN ('payout', 'cash_trip')), 0) as earnings
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.userId = u.id
       LEFT JOIN rides r ON r.driverId = u.id
       LEFT JOIN wallet_transactions wt ON wt.userId = u.id
       WHERE u.role IN ('driver', 'motorist')
       GROUP BY u.id, u.fullName, u.city, dp.vehicleType
       ORDER BY "completedRides" DESC
       LIMIT 10`
    );
    res.json(rows.map((r: any) => ({
      id: r.id,
      fullName: r.fullName,
      city: r.city,
      vehicleType: r.vehicleType,
      completedRides: Number(r.completedRides || 0),
      earnings: Number(r.earnings || 0),
    })));
  } catch (error) {
    console.error('Analytics top-drivers error:', error);
    res.status(500).json({ message: 'Failed to fetch top drivers' });
  }
});

router.get('/admin/live-locations', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    // Only get users who are online and have a location
    const users = await db.all(
      'SELECT id, fullName, role, currentLat, currentLng, isOnline FROM users WHERE isOnline = TRUE AND currentLat IS NOT NULL AND currentLng IS NOT NULL'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch live locations' });
  }
});

// ─── ADMIN: GET PENDING DRIVERS ──────────────────────
// Despite the route name (kept for backward compatibility with the admin
// frontend), this now returns ALL drivers/motorists, not just pending ones.
// AdminApprovals.tsx has "All / Pending / Approved / Rejected" filter tabs
// that filter this list client-side by verificationStatus — previously the
// query hardcoded verificationStatus = 'pending', so every tab except
// "Pending" silently showed zero drivers.
router.get('/admin/pending-drivers', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const drivers = await db.all(
      'SELECT * FROM users WHERE (role = ? OR role = ?) ORDER BY createdAt DESC',
      ['driver', 'motorist']
    );
    res.json({ count: drivers.length, drivers: drivers.map(sanitizeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending drivers.' });
  }
});

router.post('/forgot-password', authLimiter, smsLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const db = getDB();
    const cleanPhone = normalizePhone(phone);

    const user = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    if (!user) {
      return res.json({ message: 'If registered, you will receive a reset code.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await db.run('CREATE TABLE IF NOT EXISTS password_resets (phone TEXT PRIMARY KEY, code TEXT, expires DATETIME)');
    await db.run('INSERT INTO password_resets (phone, code, expires) VALUES (?, ?, ?) ON CONFLICT (phone) DO UPDATE SET code = EXCLUDED.code, expires = EXCLUDED.expires', [cleanPhone, resetCode, new Date(Date.now() + 10 * 60 * 1000).toISOString()]);

    // Send via SMS
    const smsResult = await notificationService.sendSMS(cleanPhone, `Your NAVIGO reset code is: ${resetCode}. Valid for 10 minutes.`);

    // Send via Email if available
    let emailResult = { success: false };
    if (user.email) {
      emailResult = await notificationService.sendEmail(
        user.email,
        'Your NAVIGO Password Reset Code',
        `Your NAVIGO reset code is: ${resetCode}. Please enter this code to reset your password. Valid for 10 minutes.`
      );
    }

    // Reset code sent via SMS/Email

    res.json({
      message: 'If registered, you will receive a reset code.',
      sentVia: {
        sms: smsResult.success,
        email: user.email ? emailResult.success : false
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process request.' });
  }
});

router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;
    const db = getDB();
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');

    const reset = await db.get('SELECT * FROM password_resets WHERE phone = ?', [cleanPhone]);
    if (!reset || reset.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    if (new Date() > new Date(reset.expires)) {
      return res.status(400).json({ message: 'Reset code expired.' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.run('UPDATE users SET password = ? WHERE phone = ?', [hashedPassword, cleanPhone]);
    await db.run('DELETE FROM password_resets WHERE phone = ?', [cleanPhone]);

    res.json({ message: 'Password reset successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed.' });
  }
});

router.get('/_dev/users', authenticate, authorize(['admin']), (_req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    db.all('SELECT * FROM users', [], (err, rows) => {
      res.json({ count: rows?.length || 0, users: rows?.map(sanitizeUser) || [] });
    });
  } catch (e) {
    res.status(500).json({ message: 'Dev users fetch failed.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user?.userId]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

export default router;
