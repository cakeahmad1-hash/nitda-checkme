import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDbClient } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!process.env.POSTGRES_URL) {
    return response.status(500).json({ 
      success: false, 
      error: 'POSTGRES_URL environment variable is missing. Check your Vercel Project Settings.' 
    });
  }

  // Use the helper that strips 'channel_binding=require'
  const client = createDbClient();

  try {
    await client.connect();

    // Create visitor_logs table
    await client.sql`
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
        check_in BIGINT,
        check_out BIGINT,
        duration TEXT,
        status TEXT,
        custom_data JSONB,
        context TEXT
      );
    `;

    // Create events table
    await client.sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at BIGINT,
        custom_fields JSONB
      );
    `;

    return response.status(200).json({ success: true, message: "Database tables initialized successfully." });
  } catch (error) {
    console.error('Setup failed:', error);
    return response.status(500).json({ success: false, error: String(error) });
  } finally {
    try { await client.end(); } catch (e) {}
  }
}