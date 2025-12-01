import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  // Visitors table
  await sql`
    CREATE TABLE IF NOT EXISTS visitors_log (
      id SERIAL PRIMARY KEY,
      ip TEXT,
      page TEXT,
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      device_type TEXT
    )
  `;

  // Events table
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Scan table
  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      code TEXT,
      scanned_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  res.status(200).json({ success: true, message: "Tables created" });
}
