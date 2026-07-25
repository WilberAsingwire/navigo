import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { User } from '../models/User.ts';

const GOOGLE_CLIENT_ID     = process.env['GOOGLE_CLIENT_ID'];
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'];
const FACEBOOK_APP_ID      = process.env['FACEBOOK_APP_ID'];
const FACEBOOK_APP_SECRET  = process.env['FACEBOOK_APP_SECRET'];
const FRONTEND_URL         = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

// ── Google OAuth ─────────────────────────────────────────────────────────────
// Only register the strategy if credentials are present in .env.
// Without this guard the server crashes on startup when keys are missing.
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  '/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name:     profile.displayName,
            email:    profile.emails?.[0]?.value ?? '',
            phone:    'Not provided',
            password: '',
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  ));
  console.log('[Passport] Google strategy registered');
} else {
  console.warn('[Passport] Google OAuth skipped — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in .env');
}

// ── Facebook OAuth ────────────────────────────────────────────────────────────
if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID:       FACEBOOK_APP_ID,
      clientSecret:   FACEBOOK_APP_SECRET,
      callbackURL:    '/api/auth/facebook/callback',
      profileFields:  ['id', 'displayName', 'emails'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
          user = await User.create({
            facebookId: profile.id,
            name:       profile.displayName,
            email:      profile.emails?.[0]?.value ?? '',
            phone:      'Not provided',
            password:   '',
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  ));
  console.log('[Passport] Facebook strategy registered');
} else {
  console.warn('[Passport] Facebook OAuth skipped — FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set in .env');
}

export default passport;
