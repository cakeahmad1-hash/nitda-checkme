import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDbClient, VisitorStatus } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createDbClient();
  
  try {
    await client.connect();
  } catch (error) {
    return response.status(500).json({ 
        error: 'Database connection failed', 
        currentlyIn: 0,
        totalVisitorsToday: 0,
        totalEvents: 0
    });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEpoch = todayStart.getTime();

    const { rows: todayLogs } = await client.sql`SELECT visitor_id, status FROM visitor_logs WHERE check_in >= ${todayEpoch}`;
    const { rows: allIn } = await client.sql`SELECT count(*) as count FROM visitor_logs WHERE status = ${VisitorStatus.IN}`;
    const { rows: eventsCount } = await client.sql`SELECT count(*) as count FROM events`;

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
    return response.status(200).json({
        currentlyIn: 0,
        totalVisitorsToday: 0,
        totalEvents: 0
    });
  } finally {
    try { await client.end(); } catch (e) {}
  }
}