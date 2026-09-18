import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';
import { authLimiter, smsLimiter } from '../middleware/rateLimit';

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
    const { fullName, phone, password, email, role } = req.body;
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

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one letter and one number.' });
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

    const userId = `user_${Math.random().toString(36).substring(2, 11)}${Date.now()}`;
    const newUser: any = {
      id: userId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: processedEmail,
      password: hashedPassword,
      role: userRole,
      phoneVerified: true,
      verificationStatus: needsVerification ? 'unverified' : 'approved',
      createdAt: new Date().toISOString()
    };

    try {
      await db.run(
        'INSERT INTO users (id, fullName, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newUser.id, newUser.fullName, newUser.phone, newUser.email, newUser.password, newUser.role, newUser.phoneVerified, newUser.verificationStatus, newUser.createdAt]
      );
      // Create a wallet row (starting at 0 balance) so future top-ups/payouts work.
      await db.run(
        'INSERT INTO wallets (userId, balance) VALUES (?, 0) ON CONFLICT(userId) DO NOTHING',
        [newUser.id]
      );
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
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Phone/email and password are required.' });
    }
    const db = getDB();

    let user;
    if (identifier.includes('@')) {
      user = await db.get('SELECT * FROM users WHERE email = ?', [identifier.toLowerCase().trim()]);
    } else {
      const cleanPhone = normalizePhone(identifier);
      user = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    }

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your email/phone or password.' });
    }

    const passwordMatch = await comparePassword(password, user.password);
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
    console.error('Login error:', (error as any)?.message);
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
    await db.run(
      'INSERT INTO wallets (userId, balance) VALUES (?, 0) ON CONFLICT(userId) DO NOTHING',
      [newUser.id]
    );

    const token = generateToken({ id: newUser.id, role: newUser.role });
    res.json({ message: 'Registration successful!', user: sanitizeUser(newUser), token });
  } catch (error) {
    console.error('Google register error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ─── UPLOAD DRIVER DOCUMENTS ─────────────────────────
// SECURITY FIX: Requires auth, uses authenticated userId — no body userId spoofing
router.post('/upload-documents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    const { nationalId, drivingLicense, vehiclePhoto, vehiclePlate, vehicleModel, vehicleColor, selfieWithVehicle, vehicleType, isFemaleDriver } = req.body;
    const db = getDB();

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'driver' && user.role !== 'motorist') {
      return res.status(400).json({ message: 'Only drivers and motorists can upload documents.' });
    }

    if (!drivingLicense || !drivingLicense.trim()) {
      return res.status(400).json({ message: 'Driving license is required.' });
    }
    if (!vehiclePlate || !vehiclePlate.trim()) {
      return res.status(400).json({ message: 'Vehicle plate number is required.' });
    }
    if (!vehicleType) {
      return res.status(400).json({ message: 'Vehicle type is required.' });
    }
    if (!vehicleModel || !vehicleModel.trim()) {
      return res.status(400).json({ message: 'Vehicle model is required.' });
    }

    const cleanPlate = vehiclePlate.trim().toUpperCase();
    // Validate Ugandan plate format loosely: e.g. UAX 123Z or UAX123Z
    if (cleanPlate.length < 3 || cleanPlate.length > 12) {
      return res.status(400).json({ message: 'Invalid plate number format.' });
    }

    const driverDocs = JSON.stringify({
      nationalId: nationalId?.trim() || null,
      drivingLicense: drivingLicense.trim(),
      vehiclePhoto: vehiclePhoto || 'uploaded',
      vehiclePlate: cleanPlate,
      vehicleModel: vehicleModel.trim(),
      vehicleColor: vehicleColor?.trim() || null,
      selfieWithVehicle: selfieWithVehicle || 'uploaded',
      isFemaleDriver: !!isFemaleDriver,
    });

    // 1. Update user verification status and docs
    await db.run('UPDATE users SET driverDocs = ?, verificationStatus = ?, rejectionReason = NULL WHERE id = ?', [driverDocs, 'pending', userId]);

    // 2. Upsert driver profile with vehicle type and plate
    await db.run(
      `INSERT INTO driver_profiles (userId, vehicleType, plate)
       VALUES (?, ?, ?)
       ON CONFLICT (userId) DO UPDATE SET vehicleType = EXCLUDED.vehicleType, plate = EXCLUDED.plate, online = false`,
      [userId, vehicleType, cleanPlate]
    );

    res.json({
      message: 'Documents uploaded! Admin will review within 24-48 hours.',
      user: { ...sanitizeUser(user), driverDocs: JSON.parse(driverDocs), verificationStatus: 'pending' }
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ message: 'Upload failed. Please try again.' });
  }
});

// ─── ADMIN: GET ALL USERS ────────────────────────────
router.get('/admin/users', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
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
router.get('/admin/stats', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const db = getDB();

    const [totalUsers] = await db.all('SELECT COUNT(*) as count FROM users');
    const [totalDrivers] = await db.all("SELECT COUNT(*) as count FROM users WHERE role = 'driver'");
    const [totalMotorists] = await db.all("SELECT COUNT(*) as count FROM users WHERE role = 'motorist'");
    const [activeRides] = await db.all("SELECT COUNT(*) as count FROM rides WHERE status NOT IN ('completed', 'cancelled')");
    const [revenue] = await db.all("SELECT COALESCE(SUM(ABS(amount)),0) as total FROM wallet_transactions WHERE kind = 'commission'");
    const [avgRating] = await db.all('SELECT AVG(rating) as avg FROM driver_profiles');
    const [pending] = await db.all("SELECT COUNT(*) as count FROM users WHERE verificationStatus = 'pending'");
    const [supportTicketCount] = await db.all("SELECT COUNT(*) as count FROM support_tickets WHERE status != 'resolved'");
    const [disputesCount] = await db.all("SELECT COUNT(*) as count FROM rides WHERE riderRating IS NOT NULL AND riderTags::text LIKE '%dispute%'");

    res.json({
      totalUsers: totalUsers?.count || 0,
      totalDrivers: totalDrivers?.count || 0,
      totalMotorists: totalMotorists?.count || 0,
      activeRides: activeRides?.count || 0,
      revenue: Number(revenue?.total) || 0,
      avgRating: parseFloat(avgRating?.avg || '0').toFixed(1),
      pendingApprovals: pending?.count || 0,
      supportTickets: supportTicketCount?.count || 0,
      disputes: disputesCount?.count || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ─── ADMIN: VERIFY DRIVER ────────────────────────────
router.post('/admin/verify-driver', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
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
router.post('/admin/update-user-status', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
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
router.delete('/admin/user/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
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
router.get('/admin/live-locations', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
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
router.get('/admin/pending-drivers', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const drivers = await db.all('SELECT * FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ?', ['driver', 'motorist', 'pending']);
    res.json({ count: drivers.length, drivers: drivers.map(sanitizeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending drivers.' });
  }
});

router.post('/forgot-password', authLimiter, smsLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, email } = req.body;
    const db = getDB();

    // Accept either phone OR email so the flow works for all account types.
    let user = null;
    let cleanPhone: string | null = null;
    if (phone) {
      cleanPhone = normalizePhone(phone);
      if (cleanPhone) user = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    }
    if (!user && email && /\S+@\S+\.\S+/.test(email)) {
      user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (user) cleanPhone = user.phone;
    }

    // Always return a generic message (don't leak account existence) but include
    // the reset code as `devCode` ONLY in non-production environments for QA.
    const generic = { message: 'If registered, you will receive a reset code.' };
    let devCode: string | null = null;

    if (!user || !cleanPhone) {
      return res.json(generic);
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    devCode = process.env.NODE_ENV !== 'production' ? resetCode : null;

    await db.run(
      'INSERT INTO password_resets (phone, code, expires) VALUES (?, ?, ?) ON CONFLICT (phone) DO UPDATE SET code = EXCLUDED.code, expires = EXCLUDED.expires',
      [cleanPhone, resetCode, new Date(Date.now() + 10 * 60 * 1000).toISOString()]
    );

    const smsResult = await notificationService.sendSMS(cleanPhone, `Your NAVIGO reset code is: ${resetCode}. Valid for 10 minutes.`);

    let emailResult = { success: false };
    if (user.email) {
      emailResult = await notificationService.sendEmail(
        user.email,
        'Your NAVIGO Password Reset Code',
        `Your NAVIGO reset code is: ${resetCode}. Please enter this code to reset your password. Valid for 10 minutes.`
      );
    }

    res.json({
      ...generic,
      sentVia: {
        sms: smsResult.success,
        email: user.email ? emailResult.success : false
      },
      ...(devCode ? { devCode } : {})
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request.' });
  }
});

router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, email, code, newPassword } = req.body;
    const db = getDB();

    if (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include at least one letter and one number.' });
    }
    if (!code || String(code).length !== 6) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }

    // Resolve user by phone OR email
    let user = null;
    let cleanPhone: string | null = null;
    if (phone) {
      cleanPhone = normalizePhone(phone);
      if (cleanPhone) user = await db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
    }
    if (!user && email && /\S+@\S+\.\S+/.test(email)) {
      user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (user) cleanPhone = user.phone;
    }
    if (!user || !cleanPhone) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }

    const reset = await db.get('SELECT * FROM password_resets WHERE phone = ?', [cleanPhone]);
    if (!reset || reset.code !== String(code)) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    if (new Date() > new Date(reset.expires)) {
      return res.status(400).json({ message: 'Reset code expired.' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    await db.run('DELETE FROM password_resets WHERE phone = ?', [cleanPhone]);

    res.json({ message: 'Password reset successful!' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Reset failed.' });
  }
});

router.get('/_dev/users', authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
  try {
    const db = getDB();
    const rows = await db.all('SELECT * FROM users');
    res.json({ count: rows?.length || 0, users: rows?.map(sanitizeUser) || [] });
  } catch (e) {
    console.error('Dev users fetch failed:', e);
    res.status(500).json({ message: 'Dev users fetch failed.' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [(req as AuthRequest).user?.userId]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

export default router;

