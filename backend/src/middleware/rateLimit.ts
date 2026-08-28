import rateLimit from 'express-rate-limit';

// General API rate limiter: Prevent basic DOS
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter: Prevent brute force on login/register
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 failed attempts per hour
  message: { message: 'Too many login/registration attempts from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SMS rate limiter: Prevent SMS bombing/cost spikes
export const smsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Limit each IP to 5 SMS requests per day
  message: { message: 'SMS limit exceeded. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});
