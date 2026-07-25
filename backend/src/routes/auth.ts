import express, { Request, Response } from 'express';

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

// ─── In-Memory Store ────────────────────────────────
const users: User[] = [
  // Pre-seed an admin account
  {
    id: 'admin_001',
    name: 'NAVIGO Admin',
    phone: '0770000000',
    email: 'admin@navigo.ug',
    password: 'admin123',
    role: 'admin',
    phoneVerified: true,
    verificationStatus: 'approved',
    createdAt: new Date()
  }
];

// ─── Helper ──────────────────────────────────────────
const sanitizeUser = (user: User) => {
  const { password, ...clean } = user;
  return clean;
};

const generateToken = (userId: string) => 'navigo-token-' + userId;

// ─── REGISTER ────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, email, role } = req.body;

    // Validate phone
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');
    if (!cleanPhone.match(/^07\d{8}$/)) {
      return res.status(400).json({ 
        message: 'Invalid phone number. Format: 0772000000' 
      });
    }

    // Validate name
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    // Validate password
    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    // Validate role
    const validRoles = ['customer', 'driver', 'motorist'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Check if phone exists
    const existingPhone = users.find(u => u.phone === cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered. Please login.' });
    }

    // Check email if provided
    if (email) {
      const existingEmail = users.find(u => u.email === email.toLowerCase().trim());
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered.' });
      }
    }

    // Determine verification status
    const userRole = role || 'customer';
    const needsVerification = userRole === 'driver' || userRole === 'motorist';
    
    const newUser: User = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : undefined,
      password,
      role: userRole,
      phoneVerified: true,
      verificationStatus: needsVerification ? 'unverified' : 'approved',
      createdAt: new Date()
    };

    users.push(newUser);
    
    console.log(`📝 New ${userRole}: ${newUser.name} | Phone: ${newUser.phone} | Status: ${newUser.verificationStatus}`);

    const token = generateToken(newUser.id);
    
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
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');

    const user = users.find(u => u.phone === cleanPhone && u.password === password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone or password.' });
    }

    console.log(`🔑 Login: ${user.name} (${user.role})`);

    let message = `Welcome back, ${user.name}!`;
    
    if (user.verificationStatus === 'pending') {
      message += ' Your documents are under review.';
    } else if (user.verificationStatus === 'rejected') {
      message += ` Verification rejected: ${user.rejectionReason || 'Please re-upload documents.'}`;
    } else if (user.verificationStatus === 'unverified' && (user.role === 'driver' || user.role === 'motorist')) {
      message += ' Please upload your documents to start driving.';
    }

    res.json({ message, user: sanitizeUser(user), token: generateToken(user.id) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.' });
  }
});

// ─── SOCIAL LOGIN ────────────────────────────────────
router.post('/social-login', async (req: Request, res: Response) => {
  try {
    const { provider, socialId, name, email, phone } = req.body;

    if (!provider || !socialId) {
      return res.status(400).json({ message: 'Provider and socialId required.' });
    }

    // Social login always creates CUSTOMER accounts (drivers must register manually)
    let user = users.find(u => u.socialProvider === provider && u.socialId === socialId);

    if (!user && email) {
      user = users.find(u => u.email === email.toLowerCase().trim());
      if (user) {
        user.socialProvider = provider;
        user.socialId = socialId;
      }
    }

    if (!user) {
      user = {
        id: 'user_' + Date.now(),
        name: name || `${provider} User`,
        phone: phone || '',
        email: email?.toLowerCase().trim(),
        role: 'customer', // Social login = customer only
        phoneVerified: !!phone,
        verificationStatus: phone ? 'approved' : 'unverified',
        socialProvider: provider,
        socialId,
        createdAt: new Date()
      };
      users.push(user);
    }

    console.log(`🔗 Social login: ${user.name} via ${provider}`);
    res.json({ 
      message: `Welcome, ${user.name}!`, 
      user: sanitizeUser(user), 
      token: generateToken(user.id),
      needsPhone: !user.phone 
    });
  } catch (error) {
    res.status(500).json({ message: 'Social login failed.' });
  }
});

// ─── UPLOAD DRIVER DOCUMENTS ─────────────────────────
router.post('/upload-documents', async (req: Request, res: Response) => {
  try {
    const { userId, nationalId, drivingLicense, vehiclePhoto, vehiclePlate, vehicleModel, vehicleColor, selfieWithVehicle } = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'driver' && user.role !== 'motorist') {
      return res.status(400).json({ message: 'Only drivers and motorists can upload documents.' });
    }

    // Validate required documents
    if (!drivingLicense) {
      return res.status(400).json({ message: 'Driving license is required.' });
    }
    if (!vehiclePlate) {
      return res.status(400).json({ message: 'Vehicle plate number is required.' });
    }

    user.driverDocs = {
      nationalId,
      drivingLicense,
      vehiclePhoto,
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      vehicleColor,
      selfieWithVehicle
    };
    user.verificationStatus = 'pending';

    console.log(`📄 Documents uploaded: ${user.name} | Plate: ${vehiclePlate} | Status: pending`);

    res.json({ 
      message: 'Documents uploaded! Admin will review within 24-48 hours.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed.' });
  }
});

// ─── ADMIN: VERIFY DRIVER ────────────────────────────
router.post('/admin/verify-driver', async (req: Request, res: Response) => {
  try {
    const { adminId, driverId, action, reason } = req.body;

    // Check if admin
    const admin = users.find(u => u.id === adminId && u.role === 'admin');
    if (!admin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const driver = users.find(u => u.id === driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (action === 'approve') {
      driver.verificationStatus = 'approved';
      driver.rejectionReason = undefined;
      console.log(`✅ Driver approved: ${driver.name}`);
      res.json({ message: `${driver.name} has been approved!` });
    } else if (action === 'reject') {
      driver.verificationStatus = 'rejected';
      driver.rejectionReason = reason || 'Documents not satisfactory.';
      console.log(`❌ Driver rejected: ${driver.name} - ${driver.rejectionReason}`);
      res.json({ message: `${driver.name} has been rejected. Reason: ${driver.rejectionReason}` });
    } else {
      res.status(400).json({ message: 'Action must be "approve" or "reject".' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Verification failed.' });
  }
});

// ─── ADMIN: GET PENDING DRIVERS ──────────────────────
router.get('/admin/pending-drivers', async (req: Request, res: Response) => {
  const pending = users.filter(u => 
    (u.role === 'driver' || u.role === 'motorist') && 
    u.verificationStatus === 'pending'
  );
  res.json({ count: pending.length, drivers: pending.map(sanitizeUser) });
});

// In backend/src/routes/auth.ts, update forgot-password:

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');

    const user = users.find(u => u.phone === cleanPhone);
    if (!user) {
      return res.json({ message: 'If registered, you will receive a reset code.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    (user as any).resetCode = resetCode;
    (user as any).resetCodeExpires = Date.now() + 10 * 60 * 1000;

    // 🔧 DEV: Show code in console (remove in production)
    console.log(`🔑 Reset code for ${cleanPhone}: ${resetCode}`);

    // 📱 PRODUCTION: Send SMS via Africa's Talking
    // Uncomment when you have API key:
    // try {
    //   const africastalking = require('africastalking')({
    //     apiKey: process.env.AFRICAS_TALKING_API_KEY,
    //     username: 'sandbox'
    //   });
    //   await africastalking.SMS.send({
    //     to: cleanPhone,
    //     message: `Your NAVIGO reset code is: ${resetCode}. Expires in 10 minutes.`
    //   });
    // } catch (smsError) {
    //   console.error('SMS failed:', smsError);
    // }

    res.json({ 
      message: 'If registered, you will receive a reset code.',
      devCode: resetCode // Remove in production!
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process request.' });
  }
});

// ─── RESET PASSWORD ──────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;
    const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');

    const user = users.find(u => u.phone === cleanPhone);
    if (!user) return res.status(400).json({ message: 'Invalid request.' });

    const storedCode = (user as any).resetCode;
    if (!storedCode || storedCode !== code) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    if (Date.now() > (user as any).resetCodeExpires) {
      return res.status(400).json({ message: 'Reset code expired.' });
    }

    user.password = newPassword;
    delete (user as any).resetCode;
    delete (user as any).resetCodeExpires;

    console.log(`🔑 Password reset: ${cleanPhone}`);
    res.json({ message: 'Password reset successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed.' });
  }
});

// ─── DEV: LIST ALL USERS ─────────────────────────────
router.get('/_dev/users', (_req: Request, res: Response) => {
  res.json({ count: users.length, users: users.map(sanitizeUser) });
});

export default router;