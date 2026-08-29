import { Pool } from 'pg';

let pool: Pool | null = null;

const convertPlaceholders = (query: string) => {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
};

// ─── camelCase column recovery ──────────────────────────────
// Postgres folds *unquoted* identifiers to lowercase, so a column declared as
// `fullName` is actually stored (and returned in query results) as `fullname`.
// The rest of this codebase (routes, sockets, and the frontend's TS types)
// reads/writes the camelCase spelling everywhere (e.g. `user.fullName`,
// `ride.pickupLat`), so every raw query result needs the original camelCase
// key restored alongside the lowercase one Postgres actually gives us.
// This list is every camelCase column/alias used anywhere in the schema or
// queries — keep it in sync when adding new camelCase columns.
const CAMEL_COLUMNS = [
  'acceptedAt', 'arrivedAt', 'cancelledAt', 'completedAt', 'createdAt',
  'currentLat', 'currentLng', 'distanceKm', 'driverDocs', 'driverId',
  'driverName', 'driverRating', 'driverStartLat', 'driverStartLng',
  'dropLat', 'dropLng', 'dropName', 'durationMin', 'etaAccepted',
  'etaArrive', 'etaComplete', 'etaStart', 'expiresAt', 'fareFinal',
  'fareOffered', 'fareRecommended', 'fromUser', 'fullName', 'gatewayRef',
  'isAvailable', 'isBot', 'isOnline', 'packageDetails', 'paymentMethod',
  'phoneVerified', 'pickupLat', 'pickupLng', 'pickupName', 'ratingCount',
  'receiverName', 'receiverPhone', 'rejectionReason', 'requestedAt',
  'rideId', 'riderRating', 'riderTags', 'senderId', 'senderName',
  'senderRole', 'serviceType', 'socialId', 'socialProvider', 'startedAt',
  'ticketId', 'totalTrips', 'updatedAt', 'userId', 'userName', 'userRole',
  'vehicleType', 'verificationStatus',
  // Loyalty / referrals
  'referralCode', 'referredBy', 'referredUserId', 'referrerId',
  'rewardName', 'pointsCost', 'voucherCode', 'redeemedAt', 'usedAt',
  'usedOnRideId', 'discountAmount', 'creditedAt',
  // Admin: driver_profiles fields joined onto users rows
  'driverVehicleType', 'driverRating', 'driverTotalTrips',
];
const LOWER_TO_CAMEL: Record<string, string> = {};
for (const c of CAMEL_COLUMNS) LOWER_TO_CAMEL[c.toLowerCase()] = c;

const restoreCamelCase = <T = any>(row: T): T => {
  if (!row || typeof row !== 'object') return row;
  const out: any = { ...row };
  for (const key of Object.keys(row as any)) {
    const camel = LOWER_TO_CAMEL[key];
    if (camel && !(camel in out)) {
      out[camel] = (row as any)[key];
    }
  }
  return out;
};
const restoreRows = (rows: any[]) => rows.map(restoreCamelCase);

export const initDB = async () => {
  if (pool) return pool;

  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/navigo';

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    console.log('✅ PostgreSQL database connected');

    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          fullName TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT NOT NULL DEFAULT 'rider',
          city TEXT DEFAULT 'Kampala',
          vehicleType TEXT,
          isBot BOOLEAN DEFAULT FALSE,
          phoneVerified BOOLEAN DEFAULT FALSE,
          verificationStatus TEXT CHECK(verificationStatus IN ('unverified', 'pending', 'approved', 'rejected')) DEFAULT 'unverified',
          driverDocs TEXT,
          rejectionReason TEXT,
          socialProvider TEXT,
          socialId TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          isOnline BOOLEAN DEFAULT FALSE,
          isAvailable BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          expiresAt TIMESTAMP WITH TIME ZONE NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS driver_profiles (
          userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          vehicleType TEXT DEFAULT 'boda',
          plate TEXT,
          rating DECIMAL DEFAULT 5,
          ratingCount INTEGER DEFAULT 0,
          totalTrips INTEGER DEFAULT 0,
          online BOOLEAN DEFAULT FALSE,
          lat DECIMAL,
          lng DECIMAL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wallets (
          userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          balance INTEGER DEFAULT 0,
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          kind TEXT NOT NULL, -- topup | ride_payment | payout | tip
          amount INTEGER NOT NULL,
          reference TEXT,
          note TEXT,
          rideId TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rides (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          driverId TEXT REFERENCES users(id) ON DELETE SET NULL,

          serviceType TEXT NOT NULL DEFAULT 'ride' CHECK(serviceType IN ('ride', 'delivery')),
          vehicleType TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'accepted', 'arrived', 'ongoing', 'completed', 'cancelled')),
          paymentMethod TEXT NOT NULL DEFAULT 'cash' CHECK(paymentMethod IN ('cash', 'wallet')),

          pickupName TEXT NOT NULL,
          pickupLat DECIMAL NOT NULL,
          pickupLng DECIMAL NOT NULL,
          dropName TEXT NOT NULL,
          dropLat DECIMAL NOT NULL,
          dropLng DECIMAL NOT NULL,

          distanceKm DECIMAL NOT NULL,
          durationMin DECIMAL NOT NULL,

          fareRecommended INTEGER NOT NULL,
          fareOffered INTEGER NOT NULL,
          fareFinal INTEGER NOT NULL,

          -- Delivery specific fields
          packageDetails TEXT,
          receiverName TEXT,
          receiverPhone TEXT,

          geometry JSONB,
          driverStartLat DECIMAL,
          driverStartLng DECIMAL,

          acceptedAt TIMESTAMP WITH TIME ZONE,
          arrivedAt TIMESTAMP WITH TIME ZONE,
          startedAt TIMESTAMP WITH TIME ZONE,
          completedAt TIMESTAMP WITH TIME ZONE,
          cancelledAt TIMESTAMP WITH TIME ZONE,

          etaAccepted TIMESTAMP WITH TIME ZONE,
          etaArrive TIMESTAMP WITH TIME ZONE,
          etaStart TIMESTAMP WITH TIME ZONE,
          etaComplete TIMESTAMP WITH TIME ZONE,

          expiresAt TIMESTAMP WITH TIME ZONE,
          settled BOOLEAN DEFAULT FALSE,

          riderRating INTEGER,
          riderTags JSONB,
          tip INTEGER DEFAULT 0,

          requestedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS password_resets (
          phone TEXT PRIMARY KEY,
          code TEXT,
          expires TIMESTAMP WITH TIME ZONE
        );

        CREATE TABLE IF NOT EXISTS saved_places (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id),
          label TEXT NOT NULL,
          address TEXT NOT NULL,
          lat DECIMAL NOT NULL,
          lng DECIMAL NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS support_tickets (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
          status TEXT CHECK(status IN ('open', 'in-progress', 'resolved')) DEFAULT 'open',
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS support_replies (
          id SERIAL PRIMARY KEY,
          ticketId INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
          fromUser TEXT NOT NULL,
          message TEXT NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ride_messages (
          id TEXT PRIMARY KEY,
          rideId TEXT REFERENCES rides(id) ON DELETE CASCADE,
          senderId TEXT REFERENCES users(id) ON DELETE CASCADE,
          senderName TEXT NOT NULL,
          senderRole TEXT NOT NULL,
          text TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'text',
          status TEXT NOT NULL DEFAULT 'sent',
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS topup_intents (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS platform_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payouts (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          provider TEXT NOT NULL,   -- mtn | airtel
          phone TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed
          gatewayRef TEXT,
          fee INTEGER DEFAULT 0,
          note TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completedAt TIMESTAMP WITH TIME ZONE
        );

        -- Migration: Remove role check constraint and rename 'name' to 'fullName'
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
            ALTER TABLE users DROP CONSTRAINT users_role_check;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='name') AND
             NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='fullname') THEN
            ALTER TABLE users RENAME COLUMN name TO fullName;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='status') THEN
            ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='currentlat') THEN
            ALTER TABLE users ADD COLUMN currentLat DECIMAL;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='currentlng') THEN
            ALTER TABLE users ADD COLUMN currentLng DECIMAL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND lower(column_name)='model') THEN
            ALTER TABLE driver_profiles ADD COLUMN model TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND lower(column_name)='color') THEN
            ALTER TABLE driver_profiles ADD COLUMN color TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND lower(column_name)='year') THEN
            ALTER TABLE driver_profiles ADD COLUMN year TEXT;
          END IF;

          -- The "Female Driver / Women Preferred" toggle on the driver
          -- documents form used to only write to localStorage, so it was
          -- lost on every fresh login/device and never actually visible to
          -- admins or usable for real "Women Preferred" matching.
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='isfemaledriver') THEN
            ALTER TABLE users ADD COLUMN isFemaleDriver BOOLEAN DEFAULT FALSE;
          END IF;

          -- Real referral program: every user gets a stable, unique referral
          -- code, and we record who referred whom so a reward can be
          -- credited when (and only when) the referred friend actually
          -- completes their first ride — never just for sharing the code.
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='referralcode') THEN
            ALTER TABLE users ADD COLUMN referralCode TEXT UNIQUE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND lower(column_name)='referredby') THEN
            ALTER TABLE users ADD COLUMN referredBy TEXT REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      // Backfill a referral code for any existing users that don't have one yet
      // (new users get theirs assigned at registration time).
      await client.query(`
        UPDATE users SET referralCode = UPPER(SUBSTRING(MD5(id), 1, 6))
        WHERE referralCode IS NULL;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS referrals (
          id TEXT PRIMARY KEY,
          referrerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          referredUserId TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          rewardedAt TIMESTAMP WITH TIME ZONE, -- set once the referred user completes their first ride and points are credited
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Real Zawadi Rewards ledger. Points are derived server-side from
        -- completed rides + credited referrals (never trusted from the
        -- client); redeeming a reward here deducts points and issues a
        -- voucher code that RideRequest can actually apply to a fare.
        CREATE TABLE IF NOT EXISTS loyalty_redemptions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rewardName TEXT NOT NULL,
          pointsCost INTEGER NOT NULL,
          discountAmount INTEGER NOT NULL DEFAULT 0,
          voucherCode TEXT UNIQUE NOT NULL,
          usedOnRideId TEXT REFERENCES rides(id) ON DELETE SET NULL,
          usedAt TIMESTAMP WITH TIME ZONE,
          redeemedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Database tables initialized');
    } finally {

      client.release();
    }

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  return {
    getTransactionClient: async () => {
      const client = await pool!.connect();
      return {
        query: async (query: string, params: any[] = []) => {
          const convertedQuery = convertPlaceholders(query);
          const res = await client.query(convertedQuery, params);
          if (Array.isArray(res.rows)) res.rows = restoreRows(res.rows);
          return res;
        },
        release: () => client.release(),
      };
    },
    get: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return res.rows[0] ? restoreCamelCase(res.rows[0]) : res.rows[0];
    },
    all: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return restoreRows(res.rows);
    },
    run: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      if (Array.isArray(res.rows)) res.rows = restoreRows(res.rows);
      return res;
    },
    exec: async (query: string) => {
      const statements = query.split(';').filter(s => s.trim());
      for (const statement of statements) {
        await pool!.query(statement);
      }
    }
  };
};