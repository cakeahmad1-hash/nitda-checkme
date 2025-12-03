import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS visitor_logs (
        id SERIAL PRIMARY KEY,
        visitor_id TEXT,
        name TEXT,
        department TEXT,
        organization TEXT,
        laptop_name TEXT,
        laptop_color TEXT,
        serial_number TEXT,
        visitor_type TEXT,
        event_id TEXT,
        event_name TEXT,
        check_in TIMESTAMP,
        check_out TIMESTAMP,
        duration TEXT,
        status TEXT,
        custom_data JSONB,
        context TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        event_id TEXT,
        event_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    return res.status(200).json({ success: true, message: "Tables created" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
