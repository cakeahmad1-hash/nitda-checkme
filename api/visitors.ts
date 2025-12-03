import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/postgres';
import { mapLog } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createClient();
  await client.connect();

  try {
    if (request.method === 'GET') {
        const { rows } = await client.sql`SELECT * FROM visitor_logs ORDER BY check_in DESC LIMIT 500`;
        return response.status(200).json(rows.map(mapLog));
    }

    if (request.method === 'POST') {
        const body = request.body;
        
        const customDataJson = JSON.stringify(body.customData || {});

        const { rows } = await client.sql`
            INSERT INTO visitor_logs (
                visitor_id, name, department, organization, laptop_name, laptop_color, 
                serial_number, visitor_type, event_id, event_name, check_in, check_out, 
                duration, status, custom_data, context
            )
            VALUES (
                ${body.visitorId}, ${body.name}, ${body.department || null}, ${body.organization || null}, 
                ${body.laptopName || null}, ${body.laptopColor || null}, ${body.serialNumber || null}, 
                ${body.visitorType || null}, ${body.eventId || null}, ${body.eventName || null}, 
                ${body.checkIn}, ${body.checkOut || null}, ${body.duration || null}, 
                ${body.status}, ${customDataJson}::jsonb, ${body.context || 'gate'}
            )
            RETURNING *;
        `;
        return response.status(201).json(mapLog(rows[0]));
    }

    if (request.method === 'PUT') {
        const { id, name, department, laptopName, laptopColor, serialNumber, visitorType } = request.body;
        
        await client.sql`
            UPDATE visitor_logs 
            SET name = ${name}, department = ${department}, laptop_name = ${laptopName},
                laptop_color = ${laptopColor}, serial_number = ${serialNumber}, visitor_type = ${visitorType}
            WHERE id = ${id}
        `;
        
        // Sync profile updates to other logs
        const { rows: logRows } = await client.sql`SELECT visitor_id FROM visitor_logs WHERE id = ${id}`;
        if (logRows.length > 0) {
            const visitorId = logRows[0].visitor_id;
            await client.sql`
                UPDATE visitor_logs
                SET name = ${name}, department = ${department}, laptop_name = ${laptopName},
                    laptop_color = ${laptopColor}, serial_number = ${serialNumber}, visitor_type = ${visitorType}
                WHERE visitor_id = ${visitorId} AND id != ${id}
            `;
        }
        
        return response.status(200).json({ success: true });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.end();
  }
}