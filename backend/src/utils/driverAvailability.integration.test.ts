import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool, PoolClient } from 'pg';
import { syncDriverAvailability } from './driverAvailability';

const suite = process.env.DATABASE_URL ? describe : describe.skip;

suite('syncDriverAvailability (PostgreSQL integration)', () => {
  let pool: Pool;
  let client: PoolClient;
  // Isolate this test from the application's tables and from other test schemas.
  const schema = `navigo_availability_test_${process.pid}`;

  const db = {
    run: async (query: string, params: any[] = []) => {
      let index = 1;
      const sql = query.replace(/\?/g, () => `$${index++}`);
      return client.query(sql, params);
    },
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    client = await pool.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        isOnline BOOLEAN NOT NULL DEFAULT FALSE,
        isAvailable BOOLEAN NOT NULL DEFAULT FALSE,
        verificationStatus TEXT NOT NULL,
        status TEXT
      );
      CREATE TABLE rides (
        id TEXT PRIMARY KEY,
        driverId TEXT,
        status TEXT NOT NULL
      );
    `);
  });

  beforeEach(async () => {
    await client.query('DELETE FROM rides');
    await client.query('DELETE FROM users');
    await client.query(
      `INSERT INTO users (id, isOnline, isAvailable, verificationStatus, status)
       VALUES ('driver-1', TRUE, FALSE, 'approved', 'active')`,
    );
  });

  afterAll(async () => {
    if (client) {
      try {
        await client.query('RESET search_path');
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        client.release();
      }
    }
    if (pool) await pool.end();
  });

  const readAvailability = async () => {
    const result = await client.query(
      'SELECT isAvailable FROM users WHERE id = $1',
      ['driver-1'],
    );
    return result.rows[0]?.isavailable ?? result.rows[0]?.isAvailable;
  };

  it('makes an online, approved, active driver available when they have no active ride', async () => {
    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(true);
  });

  it('keeps a driver unavailable while an assigned ride is active, then restores availability after completion', async () => {
    await client.query(
      "INSERT INTO rides (id, driverId, status) VALUES ('ride-1', 'driver-1', 'ongoing')",
    );

    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(false);

    await client.query("UPDATE rides SET status = 'completed' WHERE id = 'ride-1'");
    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(true);
  });

  it('keeps an offline driver unavailable', async () => {
    await client.query("UPDATE users SET isOnline = FALSE WHERE id = 'driver-1'");
    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(false);
  });

  it('keeps an unapproved or suspended driver unavailable', async () => {
    await client.query("UPDATE users SET verificationStatus = 'pending' WHERE id = 'driver-1'");
    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(false);

    await client.query(
      "UPDATE users SET verificationStatus = 'approved', status = 'suspended' WHERE id = 'driver-1'",
    );
    await syncDriverAvailability(db, 'driver-1');
    expect(await readAvailability()).toBe(false);
  });
});
