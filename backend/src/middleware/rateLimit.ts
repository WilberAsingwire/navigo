import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';

/**
 * CGNAT-aware rate limiting (H13).
 *
 * In Uganda most mobile users sit behind carrier-grade NAT, so hundreds of
 * legitimate users can share one public IP. Pure per-IP limits either lock
 * out whole neighbourhoods or are set so high they stop nothing. Strategy:
 *   - Per-IP limits stay as LOOSE flood guards.
 *   - The STRICT limits key on what the attacker is actually attacking:
 *     the account identifier (phone/email), the target phone (SMS), or the
 *     authenticated user ID.
 */

const ipKey = (req: Request) => ipKeyGenerator(req.ip || 'unknown');

/** Last 9 digits of a phone — normalizes 0772…, 256772…, +256 772 … to one key. */
const phoneKey = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : null;
};

/** Identifier from an auth request body: phone or email, else fall back to IP. */
const identifierKey = (req: Request) => {
  const body = req.body || {};
  return (
    phoneKey(body.phone) ||
    (typeof body.email === 'string' && body.email.trim() ? `em:${body.email.trim().toLowerCase()}` : null) ||
    (typeof body.code === 'string' && body.code.length >= 16 ? `code:${body.code.slice(0, 32)}` : null) ||
    `ip:${ipKey(req)}`
  );
};

/** Authenticated user ID (set by `authenticate`), else IP. */
const userKey = (req: Request) => {
  const userId = (req as any).user?.userId || (req as any).user?.id;
  return userId ? `u:${userId}` : `ip:${ipKey(req)}`;
};

// General API: loose per-IP flood guard (600 req / 15 min — a whole CGNAT
// block can browse, but a scraper still gets stopped).
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { message: 'Too many requests, please slow down. Try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Auth flood guard: per-IP, loose enough for a shared office/CGNAT IP.
const authIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { message: 'Too many authentication attempts from this network. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth per-account: strict — 10 attempts/hour against any single phone/email,
// no matter how many IPs the attacker rotates through.
const authAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: identifierKey,
  message: { message: 'Too many attempts for this account. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter: RequestHandler[] = [authIpLimiter, authAccountLimiter];

// SMS: strict per-target-phone (stops SMS-bombing a victim), loose per-IP.
const smsPhoneLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => phoneKey(req.body?.phone) || `ip:${ipKey(req)}`,
  message: { message: 'SMS limit reached for this number. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const smsIpLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  message: { message: 'SMS limit reached. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const smsLimiter: RequestHandler[] = [smsIpLimiter, smsPhoneLimiter];

// Ride requests: per-user (runs after `authenticate`).
export const rideRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: userKey,
  message: { message: 'Too many ride requests. Please wait a bit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Wallet money operations: per-user (runs after `authenticate`).
export const payoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: userKey,
  message: { message: 'Too many wallet requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
