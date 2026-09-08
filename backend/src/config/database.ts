import 'dotenv/config';
import { Pool, types } from 'pg';

// Postgres DATE columns (OID 1082 — internship_start/end, report_date,
// check_date, ...) are parsed by node-postgres into JS Date objects at
// LOCAL midnight of this server. Express's res.json() then serializes that
// Date via toISOString(), which converts it to UTC — in any timezone ahead
// of UTC (Thailand is UTC+7) that conversion rolls the calendar day back by
// one before the value ever reaches the frontend (saved "2026-10-19" comes
// back as "2026-10-18T17:00:00.000Z"). These columns have no time
// component to represent anyway, so return the raw "YYYY-MM-DD" string
// instead of letting pg build a Date object at all — this removes the
// server-timezone dependency entirely, for every date column in the app.
types.setTypeParser(1082, (value: string) => value);

const pool = new Pool({
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432'),
  user: process.env['DB_USER'] ?? 'postgres',
  password: process.env['DB_PASSWORD'] ?? 'postgres',
  database: process.env['DB_NAME'] ?? 'intershipdb',
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database:', process.env['DB_NAME']);
});

pool.on('error', (err) => {
  // A single idle client emitting an error should not take down the whole
  // server — log it and let the pool create a replacement connection.
  console.error('❌ Unexpected PostgreSQL client error:', err.message);
});

export default pool;
