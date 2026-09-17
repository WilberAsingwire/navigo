import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 req / 15 min per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { message: 'Too many requests, please slow down. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Auth: 10 attempts / hour per IP — prevents brute force
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { message: 'Too many login/registration attempts. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SMS: 5 / day per IP — prevents cost spikes
export const smsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { message: 'SMS limit reached. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ride requests: 20 / hour per IP
export const rideRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: 'Too many ride requests. Please wait a bit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Wallet payouts: 10 / hour
export const payoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many payout requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
