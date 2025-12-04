import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/postgres"; // ✅ Correct pooled Vercel client
import { VisitorStatus } from "./types";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL // ✅ Neon pooler URL must be used
  });

  try {
    await client.connect();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEpoch = todayStart.getTime();

    // ✅ Count unique visitors who checked in today
    const { rows: todayLogs } = await client.query(
      `SELECT DISTINCT visitor_id FROM visitor_logs WHERE check_in >= $1`,
      [todayEpoch]
    );

    // ✅ Count visitors currently inside
    const { rows: inRows } = await client.query(
      `SELECT COUNT(*) as count FROM visitor_logs WHERE status = $1 AND check_out IS NULL`,
      [VisitorStatus.IN]
    );

    // ✅ Count events
    const { rows: eventRows } = await client.query(
      `SELECT COUNT(*) as count FROM events`
    );

    return response.status(200).json({
      success: true, // 🔥 Add this to avoid confusion
      currentlyIn: parseInt(inRows[0].count),
      totalVisitorsToday: todayLogs.length,
      totalEvents: parseInt(eventRows[0].count)
    });

  } catch (error: unknown) {
    console.error("❗ Stats API crashed:", error);
    return response.status(200).json({
      success: false,
      currentlyIn: 0,
      totalVisitorsToday: 0,
      totalEvents: 0
    });
  } finally {
    await client.end();
  }
}
