import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { getDB } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please login.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  // Enforce admin suspend/ban actions for the lifetime of the JWT (up to 30
  // days), not just at the moment of login. Previously AdminUsers.tsx could
  // "Suspend"/"Ban" a user and the DB row would update, but nothing ever
  // checked users.status again — the account kept working everywhere
  // (booking rides, driving, wallet, everything) for as long as its token
  // was valid, making the admin action a complete no-op.
  try {
    const db = getDB();
    const user = await db.get('SELECT status, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Your account has been banned. Contact support if you believe this is a mistake.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Contact support for help restoring access.' });
    }
  } catch (e) {
    console.error('Auth status check error:', e);
    return res.status(500).json({ message: 'Authentication check failed.' });
  }

  req.user = {
    userId: decoded.id,
    role: decoded.role,
  };

  next();
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
    }

    next();
  };
};
