import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/postgres';
import { mapEvent } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL, // ✅ uses Neon pooled URL from Vercel env
  });

  try {
    await client.connect();

    if (request.method === 'GET') {
      const { id } = request.query;

      if (id) {
        const { rows } = await client.query("SELECT * FROM events WHERE id = $1", [id]);
        if (rows.length === 0) return response.status(404).json({ error: 'Event not found' });
        return response.status(200).json(mapEvent(rows[0]));
      }

      const { rows } = await client.query("SELECT * FROM events ORDER BY created_at DESC LIMIT 500");
      return response.status(200).json(rows.map(mapEvent));
    }

    if (request.method === 'POST') {
      const { name, customFields } = request.body;
      const createdAt = Date.now();
      const customFieldsJson = JSON.stringify(customFields || []);

      const { rows } = await client.query(
        "INSERT INTO events (name, created_at, custom_fields) VALUES ($1, $2, $3::jsonb) RETURNING *",
        [name, createdAt, customFieldsJson]
      );

      return response.status(201).json(mapEvent(rows[0]));
    }

    return response.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error("❗ Events API crashed:", error);
    return response.status(500).json({ error: 'Internal Server Error', details: String(error) });
  } finally {
    await client.end();
  }
}
