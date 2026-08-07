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
          name TEXT NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password TEXT,
          role TEXT CHECK(role IN ('customer', 'driver', 'motorist', 'admin')) NOT NULL,
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

        CREATE TABLE IF NOT EXISTS rides (
          id TEXT PRIMARY KEY,
          pickup TEXT NOT NULL,
          destination TEXT NOT NULL,
          rideType TEXT NOT NULL,
          paymentMethod TEXT NOT NULL,
          fare DECIMAL,
          status TEXT NOT NULL,
          driverId TEXT REFERENCES users(id),
          requestedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          estimatedPickupTime TEXT
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