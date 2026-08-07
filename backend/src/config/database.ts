import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export type Database = sqlite3 the database; // Fixed typo in original logic

let db: any = null;

export const initDB = async () => {
  if (db) return db;

  try {
    db = await open({
      filename: path.join(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });

    console.log('✅ SQLite database connected');

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('customer', 'driver', 'motorist', 'admin')) NOT NULL,
        phoneVerified INTEGER DEFAULT 0,
        verificationStatus TEXT CHECK(verificationStatus IN ('unverified', 'pending', 'approved', 'rejected')) DEFAULT 'unverified',
        driverDocs TEXT,
        rejectionReason TEXT,
        socialProvider TEXT,
        socialId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        pickup TEXT NOT NULL,
        destination TEXT NOT NULL,
        rideType TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        fare REAL,
        status TEXT NOT NULL,
        driverId TEXT,
        requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        estimatedPickupTime TEXT,
        FOREIGN KEY (driverId) REFERENCES users (id)
      );
    `);

    // Add driver availability columns if they don't exist
    const userColumns = await db.all('PRAGMA table_info(users)');
    const columns = userColumns.map((c: any) => c.name);

    if (!columns.includes('isOnline')) {
      await db.run('ALTER TABLE users ADD COLUMN isOnline INTEGER DEFAULT 0');
      console.log('✅ Added isOnline column to users');
    }
    if (!columns.includes('isAvailable')) {
      await db.run('ALTER TABLE users ADD COLUMN isAvailable INTEGER DEFAULT 0');
      console.log('✅ Added isAvailable column to users');
    }

    console.log('✅ Database tables initialized');
    return db;
  } catch (error) {
    console.error('❌ SQLite connection failed:', error);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
};
