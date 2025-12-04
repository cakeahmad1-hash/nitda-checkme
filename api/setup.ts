import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/postgres"; // ✅ Compatible pooled Vercel connector

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL, // ✅ You must use the Neon pooler URL here
  });

  try {
    await client.connect();

    // ✅ 1. Create visitor_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitor_logs (
        id SERIAL PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        name TEXT,
        department TEXT,
        organization TEXT,
        laptop_name TEXT,
        laptop_color TEXT,
        serial_number TEXT,
        visitor_type TEXT,
        event_id TEXT,
        event_name TEXT,
        check_in BIGINT,
        check_out BIGINT,
        duration TEXT,
        status TEXT,
        custom_data JSONB,
        custom_data JSONB,
        custom_data JSONB,
        context TEXT
      );
    `);

    // ✅ 2. Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at BIGINT,
        custom_fields JSONB
      );
    `);

    return response.status(200).json({
      success: true,
      message: "Database tables created successfully ✅"
    });

  } catch (error: unknown) {
    console.error("❗ Setup crashed:", error);
    return response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await client.end();
  }
}
