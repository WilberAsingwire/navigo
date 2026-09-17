import { Pool } from 'pg';

let pool: Pool | null = null;

const convertPlaceholders = (query: string) => {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
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
      `);
      console.log('✅ Database tables initialized');
    } finally {

      client.release();
    }

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', (error as any)?.message || error);
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
    };
    // Minimal mock pool object to prevent null checks
    pool = {
      query: async () => ({ rows: [], rowCount: 0 }),
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    } as any;
    // Override getDB to use mock
    (global as any).__NAVIGO_MOCK_DB__ = mockStore;
    return pool;
  }
};

export const getDB = () => {
  const mockStore = (global as any).__NAVIGO_MOCK_DB__;
  if (mockStore) {
    // In-memory fallback
    const findUser = (emailOrPhone: string) => mockStore.users.find((u: any) => u.email === emailOrPhone || u.phone === emailOrPhone);
    return {
      getTransactionClient: async () => ({
        query: async () => ({ rows: [] }),
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
        if (q.includes('select 1')) return { ok: 1 };
        return undefined;
      },
      all: async (query: string, params: any[] = []) => {
        const q = query.toLowerCase();
        if (q.includes('from users')) return mockStore.users;
        if (q.includes('from rides')) return mockStore.rides;
        if (q.includes('from wallets')) return mockStore.wallets;
        if (q.includes('from support_tickets')) return mockStore.support_tickets;
        return [];
      },
      run: async (query: string, params: any[] = []) => {
        const q = query.toLowerCase();
        if (q.includes('insert into users')) {
          const [id, fullName, phone, email] = params;
          const existing = mockStore.users.find((u: any) => u.email === email || u.phone === phone);
          if (!existing) {
            mockStore.users.push({ id, fullName, phone, email, role: params[5] || 'rider', phoneVerified: true, verificationStatus: 'approved', createdAt: new Date().toISOString() });
          }
          return { rowCount: 1 };
        }
        if (q.includes('insert into rides')) {
          mockStore.rides.push({ id: params[0], ...params });
          return { rowCount: 1 };
        }
        return { rowCount: 0 };
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
          return client.query(convertedQuery, params);
        },
        release: () => client.release(),
      };
    },
    get: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return res.rows[0];
    },
    all: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
      return res.rows;
    },
    run: async (query: string, params: any[] = []) => {
      const convertedQuery = convertPlaceholders(query);
      const res = await pool!.query(convertedQuery, params);
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