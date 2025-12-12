import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDbClient, mapLog, VisitorStatus } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  const client = createDbClient(); // no connect()

  try {
    const { visitorId, eventId, context = 'gate' } = request.body;

    const isToday = (ts: number) => {
      const d = new Date(ts);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const { rows: logs } = await client.sql`
      SELECT * FROM visitor_logs 
      WHERE visitor_id = ${visitorId} 
      ORDER BY check_in DESC
    `;
    const visitorLogs = logs.map(mapLog);

    // --- Intern logic ---
    if (context === 'intern') {
      const todaysInternLog = visitorLogs.find(log => log.context === 'intern' && isToday(log.checkIn));

      if (todaysInternLog) {
        return response.status(200).json({ action: 'already_attended', log: todaysInternLog });
      }

      const profile = consolidateProfile(visitorLogs);
      const { rows: newRows } = await client.sql`
        INSERT INTO visitor_logs (
          visitor_id, name, organization, department, laptop_name, laptop_color, 
          serial_number, visitor_type, check_in, status, context
        ) VALUES (
          ${visitorId}, ${profile.name}, ${profile.organization}, ${profile.department}, 
          ${profile.laptopName}, ${profile.laptopColor}, ${profile.serialNumber}, 
          ${profile.visitorType}, ${Date.now()}, ${VisitorStatus.ATTENDED}, 'intern'
        ) RETURNING *;
      `;
      return response.status(200).json({ action: 'attended', log: mapLog(newRows[0]) });
    }

    // --- Gate / Event logic ---
    const relevantLog = visitorLogs.find(log => (eventId ? log.eventId === eventId : log.context === 'gate'));

    if (relevantLog && relevantLog.status === VisitorStatus.IN && !relevantLog.checkOut && isToday(relevantLog.checkIn)) {
      // Check Out
      const checkOut = Date.now();
      const durationMs = checkOut - relevantLog.checkIn;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const seconds = Math.floor(((durationMs % 3600000) % 60000) / 1000);
      const duration = `${hours}h ${minutes}m ${seconds}s`;

      const { rows: updatedRows } = await client.sql`
        UPDATE visitor_logs 
        SET check_out = ${checkOut}, status = ${VisitorStatus.OUT}, duration = ${duration}
        WHERE id = ${relevantLog.id}
        RETURNING *;
      `;
      return response.status(200).json({ action: 'checkout', log: mapLog(updatedRows[0]) });
    }

    // Check In
    const profile = consolidateProfile(visitorLogs);
    const eventName = eventId ? await getEventName(client, eventId) : undefined;

    const { rows: newRows } = await client.sql`
      INSERT INTO visitor_logs (
        visitor_id, name, organization, department, laptop_name, laptop_color, 
        serial_number, visitor_type, check_in, status, event_id, event_name, context
      ) VALUES (
        ${visitorId}, ${profile.name}, ${profile.organization}, ${profile.department}, 
        ${profile.laptopName}, ${profile.laptopColor}, ${profile.serialNumber}, 
        ${profile.visitorType}, ${Date.now()}, ${VisitorStatus.IN}, ${eventId || null}, 
        ${eventName || null}, ${eventId ? 'event' : context}
      ) RETURNING *;
    `;
    return response.status(200).json({ action: 'checkin', log: mapLog(newRows[0]) });

  } catch (error) {
    console.error('Scan failed:', error);
    return response.status(500).json({ error: 'Internal Server Error', details: String(error) });
  }
}

// --- helpers ---
function consolidateProfile(logs: any[]) {
  const valid = (val: any) => val && val !== 'Unknown' && val !== '';
  return logs.reduce((acc, log) => ({
    name: valid(log.name) ? log.name : acc.name,
    organization: valid(log.organization) ? log.organization : acc.organization,
    department: valid(log.department) ? log.department : acc.department,
    laptopName: valid(log.laptopName) ? log.laptopName : acc.laptopName,
    laptopColor: valid(log.laptopColor) ? log.laptopColor : acc.laptopColor,
    serialNumber: valid(log.serialNumber) ? log.serialNumber : acc.serialNumber,
    visitorType: valid(log.visitorType) ? log.visitorType : acc.visitorType,
  }), { 
    name: 'Unknown', organization: '', department: '', laptopName: '', 
    laptopColor: '', serialNumber: '', visitorType: undefined 
  });
}

async function getEventName(client: any, id: string) {
  try {
    const { rows } = await client.sql`SELECT name FROM events WHERE id = ${id}`;
    return rows[0]?.name;
  } catch {
    return undefined;
  }
}
