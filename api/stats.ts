
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { VisitorStatus } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
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
    // Return default stats if DB table doesn't exist yet to prevent UI crash
    return response.status(200).json({
        currentlyIn: 0,
        totalVisitorsToday: 0,
        totalEvents: 0
    });
  }
}
