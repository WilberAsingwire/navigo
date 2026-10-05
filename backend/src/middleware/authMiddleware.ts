import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { getBlockMessage } from '../utils/userStatus';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// Use Request type for compatibility with Express 5 types — cast internally to AuthRequest
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please login.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ message: 'Invalid authorization header format.' });
  }

  const token = parts[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id || !decoded.role) {
    return res.status(401).json({ message: 'Invalid or expired token. Please login again.' });
  }

  // Enforce account status — a valid JWT is not enough if the account was
  // banned/suspended/deleted after the token was issued.
  const blockMessage = await getBlockMessage(decoded.id);
  if (blockMessage) {
    return res.status(403).json({ message: blockMessage });
  }

  (req as AuthRequest).user = {
    userId: decoded.id,
    role: decoded.role,
  };

  next();
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
    }
    next();
  };
};