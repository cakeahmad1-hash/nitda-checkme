import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { mapEvent } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (request.method === 'GET') {
        const { id } = request.query;
        
        if (id) {
            const { rows } = await sql`SELECT * FROM events WHERE id = ${id as string}`;
            if (rows.length === 0) return response.status(404).json({ error: 'Event not found' });
            return response.status(200).json(mapEvent(rows[0]));
        } else {
            const { rows } = await sql`SELECT * FROM events ORDER BY created_at DESC`;
            return response.status(200).json(rows.map(mapEvent));
        }
    } 
    
    if (request.method === 'POST') {
        const { name, customFields } = request.body;
        const createdAt = Date.now();
        const customFieldsJson = JSON.stringify(customFields || []);
        
        const { rows } = await sql`
            INSERT INTO events (name, created_at, custom_fields)
            VALUES (${name}, ${createdAt}, ${customFieldsJson})
            RETURNING *;
        `;
        
        return response.status(201).json(mapEvent(rows[0]));
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}