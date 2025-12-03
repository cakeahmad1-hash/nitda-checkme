import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/postgres';

// ✅ Reuse client on warm requests to avoid crashes
let cachedClient: ReturnType<typeof createClient> | null = null;

export default async function handler(request: VercelRequest, response: VercelResponse) {

  try {
    const client = cachedClient ?? createClient(); // ✅ let Vercel use Neon via env vars
    cachedClient = client;

    await client.connect();

    // ✅ Use .query() because .sql is not available on this client instance
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
        context TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at BIGINT,
        custom_fields JSONB
      );
    `);

    // 🚫 DO NOT close the connection manually, serverless hates that
    return response.status(200).json({
      success: true,
      message: "Database tables created successfully ✅"
    });

  } catch (error: unknown) {
    console.error('❗ Setup Crash:', error);

    // ✅ Robust error serializer so you see real errors
    let errMsg = '';
    if (error instanceof Error) {
      errMsg = error.message;
    } else {
      try {
        errMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch {
        errMsg = String(error);
      }
    }

    return response.status(500).json({
      success: false,
      error: errMsg || 'Unknown database error'
    });
  }
}
