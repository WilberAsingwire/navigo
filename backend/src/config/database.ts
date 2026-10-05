import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

/** Uniform shape returned by `db.run()`/`getTransactionClient.query()` whether backed by pg or the in-memory mock. */
export type DBRunResult = QueryResult<any>;


const convertPlaceholders = (query: string) => {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
};

/**
 * CRITICAL camelCase compatibility layer.
 *
 * PostgreSQL folds unquoted identifiers to lowercase, so `SELECT fareFinal`
 * comes back keyed as `farefinal` — but this codebase (originally written
 * against case-preserving SQLite) reads `row.fareFinal`, `row.driverId`,
 * `row.fullName`, etc. everywhere. Without normalization those reads are all
 * `undefined` on PG, silently breaking settlement, authorization checks and
 * most API responses.
 *
 * Every known camelCase column/alias is mirrored back onto each returned row
 * (the lowercase key is kept too, so both spellings work).
 */
const CAMEL_COLUMNS = [
  // users
  'fullName', 'phoneVerified', 'verificationStatus', 'driverDocs', 'rejectionReason',
  'socialProvider', 'socialId', 'createdAt', 'isOnline', 'isAvailable', 'isBot',
  'vehicleType', 'currentLat', 'currentLng',
  // sessions / generic
  'userId', 'expiresAt', 'updatedAt',
  // driver_profiles
  'ratingCount', 'totalTrips',
  // rides
  'driverId', 'serviceType', 'paymentMethod',
  'pickupName', 'pickupLat', 'pickupLng', 'dropName', 'dropLat', 'dropLng',
  'distanceKm', 'durationMin', 'fareRecommended', 'fareOffered', 'fareFinal',
  'packageDetails', 'receiverName', 'receiverPhone', 'driverStartLat', 'driverStartLng',
  'acceptedAt', 'arrivedAt', 'startedAt', 'completedAt', 'cancelledAt',
  'etaAccepted', 'etaArrive', 'etaStart', 'etaComplete', 'riderRating', 'riderTags', 'requestedAt',
  // wallet_transactions / payouts
  'rideId', 'gatewayRef',
  // topup_requests / ride_messages
  'senderPhone', 'momoRef', 'reviewedBy', 'reviewNote', 'reviewedAt', 'senderId', 'senderName', 'senderRole',
  // phone_verifications / oauth_codes
  'codeHash', 'lastSentAt', 'usedAt',
  // support
  'ticketId', 'fromUser',
  // common query aliases
  'totalEarnings', 'todayEarnings', 'weeklyEarnings', 'completedCount', 'curStatus',
  'driverName', 'driverRating', 'userName', 'userPhone', 'userRole',
];
const CASE_MAP: Record<string, string> = {};
for (const col of CAMEL_COLUMNS) CASE_MAP[col.toLowerCase()] = col;

const normalizeRow = <T extends Record<string, any>>(row: T): T => {
  if (!row || typeof row !== 'object') return row;
  for (const key of Object.keys(row)) {
    const camel = CASE_MAP[key];
    if (camel && camel !== key && !(camel in row)) {
      (row as any)[camel] = row[key];
    }
  }
  return row;
};

const normalizeResult = (res: QueryResult<any>): QueryResult<any> => {
  if (res && Array.isArray(res.rows)) res.rows.forEach(normalizeRow);
  return res;
};

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

        -- Manual (free-mode) wallet top-ups: the rider sends Mobile Money to the
        -- NAVIGO MoMo number person-to-person (no gateway fees), submits the
        -- MoMo transaction ID here, and an admin verifies & approves it.
        -- When a payment gateway is enabled later, the same wallet credit flow
        -- is reused — only the verification step changes.
        CREATE TABLE IF NOT EXISTS topup_requests (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          provider TEXT NOT NULL,          -- mtn | airtel
          senderPhone TEXT NOT NULL,       -- number the money was sent FROM
          momoRef TEXT NOT NULL,           -- Mobile Money transaction ID
          status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
          reviewedBy TEXT,
          reviewNote TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          reviewedAt TIMESTAMP WITH TIME ZONE
        );

        -- Persisted ride chat — survives reconnects and provides an audit trail
        -- for disputes and safety investigations.
        CREATE TABLE IF NOT EXISTS ride_messages (
          id TEXT PRIMARY KEY,
          rideId TEXT REFERENCES rides(id) ON DELETE CASCADE,
          senderId TEXT REFERENCES users(id) ON DELETE SET NULL,
          senderName TEXT,
          senderRole TEXT,
          text TEXT NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Phone verification OTPs — codes stored HASHED (a DB leak must not
        -- expose live codes), 10-minute expiry, attempt-capped.
        CREATE TABLE IF NOT EXISTS phone_verifications (
          phone TEXT PRIMARY KEY,
          codeHash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expiresAt TIMESTAMP WITH TIME ZONE NOT NULL,
          lastSentAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- One-time OAuth exchange codes (H9): social login redirects carry a
        -- short-lived random code instead of the JWT itself, so tokens never
        -- land in browser history, server logs, or Referer headers.
        CREATE TABLE IF NOT EXISTS oauth_codes (
          code TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          expiresAt TIMESTAMP WITH TIME ZONE NOT NULL,
          usedAt TIMESTAMP WITH TIME ZONE
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
        END $$;

        -- Indexes for the hot query paths (rides by user/driver+status, wallet
        -- history, online-driver lookups). Idempotent via IF NOT EXISTS.
        CREATE INDEX IF NOT EXISTS idx_rides_user_status ON rides (userId, status);
        CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON rides (driverId, status);
        CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides (requestedAt);
        CREATE INDEX IF NOT EXISTS idx_wtx_user_created ON wallet_transactions (userId, createdAt);
        CREATE INDEX IF NOT EXISTS idx_users_role_online ON users (role, isOnline, isAvailable);
        CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts (userId, createdAt);
        CREATE INDEX IF NOT EXISTS idx_topups_user ON topup_requests (userId, createdAt);
        CREATE INDEX IF NOT EXISTS idx_topups_status ON topup_requests (status, createdAt);
        CREATE INDEX IF NOT EXISTS idx_ride_messages ON ride_messages (rideId, createdAt);

        -- One MoMo transaction ID can only ever be claimed once.
        CREATE UNIQUE INDEX IF NOT EXISTS uq_topup_momoref ON topup_requests (momoRef);
      `);

      // A payment reference may only ever be credited ONCE — closes the
      // concurrent double-topup race at the database level. Run separately so
      // pre-existing duplicate rows (if any) don't block server startup.
      try {
        await client.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS uq_wtx_reference ON wallet_transactions (reference) WHERE reference IS NOT NULL'
        );
      } catch (idxErr: any) {
        console.warn('⚠️ Could not create unique index on wallet_transactions.reference (duplicate refs exist?):', idxErr?.message);
      }

      console.log('✅ Database tables initialized');
    } finally {

      client.release();
    }

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', (error as any)?.message || error);

    // SAFETY: never silently serve a fake in-memory DB in production — that
    // would accept registrations/rides into RAM and lose them, while
    // /api/health kept reporting "ok". Fail fast so the platform restarts us
    // and the outage is visible. The mock remains available for local dev
    // previews (or explicitly via USE_MOCK_DB=1).
    if (process.env.NODE_ENV === 'production' && process.env.USE_MOCK_DB !== '1') {
      throw error;
    }

    console.warn('⚠️ Falling back to in-memory mock DB for dev preview (no PG). API will run degraded.');
    // Create a mock pool that satisfies getDB interface but stores nothing
    const mockStore: Record<string, any[]> = {
      users: [
        { id: 'admin_demo', fullName: 'NAVIGO Admin', email: 'admin@navigo.ug', phone: '0770000000', role: 'admin', phoneVerified: true, verificationStatus: 'approved', createdAt: new Date().toISOString() },
        { id: 'rider_demo', fullName: 'Demo Rider', email: 'rider@navigo.ug', phone: '0771111111', role: 'rider', phoneVerified: true, verificationStatus: 'approved', createdAt: new Date().toISOString() },
        { id: 'driver_demo', fullName: 'Demo Driver', email: 'driver@navigo.ug', phone: '0772222222', role: 'driver', phoneVerified: true, verificationStatus: 'approved', createdAt: new Date().toISOString() },
      ],
      rides: [],
      wallets: [],
      wallet_transactions: [],
      saved_places: [],
      support_tickets: [],
      driver_profiles: [],
      topup_requests: [],
      payouts: [],
      ride_messages: [],
      phone_verifications: [],
    };
    // Minimal mock pool object to prevent null checks
    const emptyResult = (): QueryResult<any> => ({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });
    pool = {
      query: async () => emptyResult(),
      connect: async () => ({ query: async () => emptyResult(), release: () => {} }),
    } as any;
    // Override getDB to use mock
    (global as any).__NAVIGO_MOCK_DB__ = mockStore;
    return pool;
  }
};

export const getDB = () => {
  const mockStore = (global as any).__NAVIGO_MOCK_DB__;
  const emptyResult = (rows: any[] = []): QueryResult<any> => ({ rows, rowCount: rows.length, command: '', oid: 0, fields: [] });
  if (mockStore) {
    // In-memory fallback
    const findUser = (emailOrPhone: string) => mockStore.users.find((u: any) => u.email === emailOrPhone || u.phone === emailOrPhone);
    return {
      getTransactionClient: async () => ({
        query: async (_q: string, _p: any[] = []) => emptyResult([]),
        release: () => {},
      }),
      get: async (query: string, params: any[] = []) => {
        const q = query.toLowerCase();
        if (q.includes('from users')) {
          if (params[0]) {
            return mockStore.users.find((u: any) => u.email === params[0] || u.phone === params[0] || u.id === params[0] || u.email === params[0]?.toLowerCase?.());
          }
          return mockStore.users[0];
        }
        if (q.includes('from wallets')) {
          return mockStore.wallets.find((w: any) => w.userId === params[0]);
        }
        if (q.includes('from phone_verifications')) {
          return mockStore.phone_verifications.find((p: any) => p.phone === params[0]);
        }
        if (q.includes('select 1')) return { ok: 1 };
        return undefined;
      },
      all: async (query: string, params: any[] = []) => {
        const q = query.toLowerCase();
        if (q.includes('from users')) return mockStore.users;
        if (q.includes('from rides')) return mockStore.rides;
        if (q.includes('from wallets')) return mockStore.wallets;
        if (q.includes('from support_tickets')) return mockStore.support_tickets;
        if (q.includes('from topup_requests')) {
          // Rider's own list filters by userId (first param); admin list may filter by status.
          if (q.includes('where userid')) return mockStore.topup_requests.filter((t: any) => t.userId === params[0]);
          if (q.includes('t.status = ?')) return mockStore.topup_requests.filter((t: any) => t.status === params[0]);
          return mockStore.topup_requests;
        }
        if (q.includes('from payouts')) {
          if (q.includes('where userid')) return mockStore.payouts.filter((p: any) => p.userId === params[0]);
          return mockStore.payouts;
        }
        if (q.includes('from ride_messages')) return mockStore.ride_messages.filter((m: any) => m.rideId === params[0]);
        return [];
      },
      run: async (query: string, params: any[] = []) => {
        const q = query.toLowerCase();
        if (q.includes('insert into users')) {
          const [id, fullName, phone, email] = params;
          const existing = mockStore.users.find((u: any) => u.email === email || u.phone === phone);
          if (!existing) {
            mockStore.users.push({ id, fullName, phone, email, role: params[5] || 'rider', phoneVerified: params[6] !== false && params[6] !== 'false', verificationStatus: 'approved', createdAt: new Date().toISOString() });
          }
          return emptyResult();
        }
        if (q.includes('insert into rides')) {
          mockStore.rides.push({ id: params[0], ...params });
          return emptyResult();
        }
        if (q.includes('insert into support_tickets')) {
          const ticketId = mockStore.support_tickets.length + 1;
          mockStore.support_tickets.push({ id: ticketId, userId: params[0], type: params[1], description: params[2], priority: params[3] });
          return emptyResult([{ id: ticketId }]);
        }
        if (q.includes('insert into topup_requests')) {
          const [id, userId, amount, provider, senderPhone, momoRef] = params;
          if (mockStore.topup_requests.some((t: any) => t.momoRef === momoRef)) {
            const err: any = new Error('duplicate momoRef'); err.code = '23505'; throw err;
          }
          mockStore.topup_requests.push({ id, userId, amount, provider, senderPhone, momoRef, status: 'pending', createdAt: new Date().toISOString() });
          return emptyResult();
        }
        if (q.includes('insert into phone_verifications')) {
          const [phone, codeHash, expiresAt] = params;
          const existing = mockStore.phone_verifications.find((p: any) => p.phone === phone);
          if (existing) { existing.codeHash = codeHash; existing.attempts = 0; existing.expiresAt = expiresAt; }
          else mockStore.phone_verifications.push({ phone, codeHash, attempts: 0, expiresAt });
          return emptyResult();
        }
        if (q.includes('update phone_verifications')) {
          const row = mockStore.phone_verifications.find((p: any) => p.phone === params[0]);
          if (row) row.attempts = Number(row.attempts || 0) + 1;
          return emptyResult();
        }
        if (q.includes('delete from phone_verifications')) {
          mockStore.phone_verifications = mockStore.phone_verifications.filter((p: any) => p.phone !== params[0]);
          return emptyResult();
        }
        if (q.includes('update users set phoneverified')) {
          const u = mockStore.users.find((x: any) => x.phone === params[0]);
          if (u) u.phoneVerified = true;
          return emptyResult();
        }
        if (q.includes('insert into ride_messages')) {
          const [id, rideId, senderId, senderName, senderRole, text] = params;
          mockStore.ride_messages.push({ id, rideId, senderId, senderName, senderRole, text, createdAt: new Date().toISOString() });
          return emptyResult();
        }
        return emptyResult();
      },
      exec: async () => {},
    };
  }
  if (!pool) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  return {
    getTransactionClient: async () => {
      const client = await pool!.connect();
      return {
        query: async (query: string, params: any[] = []) => {
          const convertedQuery = convertPlaceholders(query);
          return normalizeResult(await client.query(convertedQuery, params));
        },
        release: () => client.release(),
      };
    },
    get: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return normalizeRow(res.rows[0]);
    },
    all: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return res.rows.map(normalizeRow);
    },
    run: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return normalizeResult(res);
    },
    exec: async (query: string) => {
      const statements = query.split(';').filter(s => s.trim());
      for (const statement of statements) {
        await pool!.query(statement);
      }
    }
  };
};