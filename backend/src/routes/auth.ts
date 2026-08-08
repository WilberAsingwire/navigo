import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

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
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: 'customer' | 'driver' | 'motorist' | 'admin';
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
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, email, role } = req.body;
    const db = getDB();

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone.match(/^07\d{8}$/)) {
      return res.status(400).json({
        message: 'Invalid phone number. Please use format 07... (e.g. 0772000000)'
      });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const validRoles = ['rider', 'driver', 'motorist'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    const existingPhone = await db.get('SELECT * FROM users WHERE phone = ?', cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered. Please login.' });
    }

    if (email) {
      const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered.' });
      }
    }

    const userRole = role || 'customer';
    const needsVerification = userRole === 'driver' || userRole === 'motorist';
    const hashedPassword = await hashPassword(password);

    const userId = 'user_' + Date.now();
    const newUser: any = {
      id: userId,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : null,
      password: hashedPassword,
      role: userRole,
      phoneVerified: 1,
      verificationStatus: needsVerification ? 'unverified' : 'approved',
      createdAt: new Date().toISOString()
    };

    await db.run(
      'INSERT INTO users (id, name, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newUser.id, newUser.name, newUser.phone, newUser.email, newUser.password, newUser.role, newUser.phoneVerified, newUser.verificationStatus, newUser.createdAt]
    );

    const token = generateToken({ id: newUser.id, role: newUser.role });
    const message = needsVerification
      ? `Welcome, ${newUser.name}! Please upload your documents for verification.`
      : `Welcome to NAVIGO, ${newUser.name}! 🚀`;

    res.status(201).json({ message, user: sanitizeUser(newUser), token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ─── LOGIN ───────────────────────────────────────────
router.get('/debug-admin', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const admin = await db.get('SELECT id, email, role, verificationStatus FROM users WHERE role = ?', ['admin']);
    res.json({
      adminFound: !!admin,
      adminDetails: admin,
      message: admin ? 'Admin exists in database' : 'No admin found in database'
    });
  } catch (error) {
    res.status(500).json({ message: 'Debug failed', error });
  }
});

router.post('/login', async (req: Request, res: Response) => {
// ... existing login logic ...
  try {
    const { identifier, password } = req.body;
    const db = getDB();

    let user;
    console.log(`🔑 Login attempt for identifier: ${identifier}`);
    if (identifier.includes('@')) {
      // Login with email
      user = await db.get('SELECT * FROM users WHERE email = ?', identifier.toLowerCase().trim());
      console.log(`Searching by email. User found: ${!!user}`);
    } else {
      // Login with phone
      const cleanPhone = normalizePhone(identifier);
      user = await db.get('SELECT * FROM users WHERE phone = ?', cleanPhone);
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

    let message = `Welcome back, ${user.name}!`;
    if (user.verificationStatus === 'pending') {
      message += ' Your documents are under review.';
    } else if (user.verificationStatus === 'rejected') {
      message += ` Verification rejected: ${user.rejectionReason || 'Please re-upload documents.'}`;
    } else if (user.verificationStatus === 'unverified' && (user.role === 'driver' || user.role === 'motorist')) {
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
    const { name, email, phone, socialId, provider } = req.body;
    const db = getDB();

    if (!phone) return res.status(400).json({ message: 'Phone number is required for registration.' });
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone.match(/^07\d{8}$/)) {
      return res.status(400).json({ message: 'Invalid phone number. Format: 0772000000' });
    }

    const existingPhone = await db.get('SELECT * FROM users WHERE phone = ?', cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered. Please login.' });
    }

    const userId = 'user_' + Date.now();
    const newUser: any = {
      id: userId,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : null,
      role: 'customer',
      phoneVerified: 1,
      verificationStatus: 'approved',
      socialProvider: provider,
      socialId: socialId,
      createdAt: new Date().toISOString()
    };

    await db.run(
      'INSERT INTO users (id, name, phone, email, role, phoneVerified, verificationStatus, socialProvider, socialId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newUser.id, newUser.name, newUser.phone, newUser.email, newUser.role, newUser.phoneVerified, newUser.verificationStatus, newUser.socialProvider, newUser.socialId, newUser.createdAt]
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
    const { userId, nationalId, drivingLicense, vehiclePhoto, vehiclePlate, vehicleModel, vehicleColor, selfieWithVehicle } = req.body;
    const db = getDB();

    const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
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

    const driverDocs = JSON.stringify({
      nationalId,
      drivingLicense,
      vehiclePhoto,
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      vehicleColor,
      selfieWithVehicle
    });

    await db.run('UPDATE users SET driverDocs = ?, verificationStatus = ? WHERE id = ?', [driverDocs, 'pending', userId]);

    res.json({
      message: 'Documents uploaded! Admin will review within 24-48 hours.',
      user: { ...user, driverDocs: JSON.parse(driverDocs), verificationStatus: 'pending' }
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed.' });
  }
});

// ─── EMERGENCY ADMIN RECOVERY ─────────────────────────
router.post('/admin/force-setup', async (req: Request, res: Response) => {
  try {
    const { secretKey, adminEmail, adminPassword } = req.body;

    if (secretKey !== 'NAVIGO_SUPER_SECRET_RECOVERY_2026') {
      return res.status(403).json({ message: 'Invalid recovery key.' });
    }

    const db = getDB();
    const hashed = await hashPassword(adminPassword || 'Kakumiro222');
    const adminId = 'admin_' + Date.now();

    await db.run('DELETE FROM users WHERE role = ?', ['admin']);
    await db.run(
      'INSERT INTO users (id, name, phone, email, password, role, phoneVerified, verificationStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, 'NAVIGO Admin', 'admin_' + adminId, adminEmail || 'navigouganda@gmail.com', hashed, 'admin', 1, 'approved', new Date().toISOString()]
    );

    res.json({
      message: 'Admin account successfully recovered!',
      email: adminEmail || 'navigouganda@gmail.com',
      password: adminPassword || 'Kakumiro222'
    });
  } catch (error) {
    console.error('Recovery error:', error);
    res.status(500).json({ message: 'Recovery failed.' });
  }
});

// ─── ADMIN: VERIFY DRIVER ────────────────────────────
router.post('/admin/verify-driver', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { driverId, action, reason } = req.body;
    const db = getDB();

    const driver = await db.get('SELECT * FROM users WHERE id = ?', driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (action === 'approve') {
      await db.run('UPDATE users SET verificationStatus = ?, rejectionReason = NULL WHERE id = ?', ['approved', driverId]);
      res.json({ message: `${driver.name} has been approved!` });
    } else if (action === 'reject') {
      await db.run('UPDATE users SET verificationStatus = ?, rejectionReason = ? WHERE id = ?', ['rejected', reason || 'Documents not satisfactory.', driverId]);
      res.json({ message: `${driver.name} has been rejected. Reason: ${reason || 'Documents not satisfactory.'}` });
    } else {
      res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Verification failed.' });
  }
});

// ─── ADMIN: GET PENDING DRIVERS ──────────────────────
router.get('/admin/pending-drivers', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const drivers = await db.all('SELECT * FROM users WHERE (role = ? OR role = ?) AND verificationStatus = ?', ['driver', 'motorist', 'pending']);
    res.json({ count: drivers.length, drivers: drivers.map(sanitizeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending drivers.' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const db = getDB();
    const cleanPhone = normalizePhone(phone);

    const user = await db.get('SELECT * FROM users WHERE phone = ?', cleanPhone);
    if (!user) {
      return res.json({ message: 'If registered, you will receive a reset code.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await db.run('CREATE TABLE IF NOT EXISTS password_resets (phone TEXT PRIMARY KEY, code TEXT, expires DATETIME)');
    await db.run('INSERT OR REPLACE INTO password_resets (phone, code, expires) VALUES (?, ?, ?)', [cleanPhone, resetCode, new Date(Date.now() + 10 * 60 * 1000).toISOString()]);

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

    console.log(`🔑 Reset code for ${cleanPhone}: ${resetCode}`);

    res.json({
      message: 'If registered, you will receive a reset code.',
      devCode: resetCode, // Kept for development ease
      sentVia: {
        sms: smsResult.success,
        email: user.email ? emailResult.success : false
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process request.' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;
    const db = getDB();
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');

    const reset = await db.get('SELECT * FROM password_resets WHERE phone = ?', cleanPhone);
    if (!reset || reset.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    if (new Date() > new Date(reset.expires)) {
      return res.status(400).json({ message: 'Reset code expired.' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.run('UPDATE users SET password = ? WHERE phone = ?', [hashedPassword, cleanPhone]);
    await db.run('DELETE FROM password_resets WHERE phone = ?', cleanPhone);

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

export default router;

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDB();
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user?.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});
