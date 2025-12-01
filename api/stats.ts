import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { VisitorStatus } from '../types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    // Get start of today (local time assumption or UTC, simplest is just timestamp math)
    // For simplicity, we filter in SQL using basic logic, or fetch necessary rows.
    // Using a rough "Last 24 hours" or "Calendar Day" is needed. 
    // Let's use JS date to get midnight epoch.
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEpoch = todayStart.getTime();

    const { rows: todayLogs } = await sql`SELECT visitor_id, status FROM visitor_logs WHERE check_in >= ${todayEpoch}`;
    const { rows: allIn } = await sql`SELECT count(*) as count FROM visitor_logs WHERE status = ${VisitorStatus.IN}`;
    const { rows: eventsCount } = await sql`SELECT count(*) as count FROM events`;

    const uniqueVisitorsToday = new Set(todayLogs.map(r => r.visitor_id)).size;
    const currentlyIn = parseInt(allIn[0].count);
    const totalEvents = parseInt(eventsCount[0].count);

    return response.status(200).json({
        currentlyIn,
        totalVisitorsToday: uniqueVisitorsToday,
        totalEvents
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
