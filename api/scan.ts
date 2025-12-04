import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/postgres';
import { mapLog, VisitorStatus } from './types';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  const client = createClient({
    connectionString: process.env.POSTGRES_URL, // ✅ Neon pooled URL
  });

  try {
    await client.connect();
  } catch (err) {
    console.error("❗ Neon connection crash:", err);
    return response.status(500).json({ success: false, error: "Database connection failed", details: String(err) });
  }

  try {
    const { visitorId, eventId, context = "gate" } = request.body;

    const isToday = (ts: number) => {
      const d = new Date(ts);
      const n = new Date();
      return d.toDateString() === n.toDateString();
    };

    // 1. Get visitor logs
    const { rows: logs } = await client.query(
      "SELECT * FROM visitor_logs WHERE visitor_id = $1 ORDER BY check_in DESC LIMIT 500",
      [visitorId]
    );

    const visitorLogs = logs.map(mapLog);

    // 2. Intern context: one attendance per day
    if (context === "intern") {
      const attended = visitorLogs.find(l => l.context === "intern" && isToday(l.checkIn));
      if (attended) {
        return response.status(200).json({ success: true, action: "already_attended", log: attended });
      }

      const profile = consolidateProfile(visitorLogs);
      const { rows: ins } = await client.query(
        `INSERT INTO visitor_logs (visitor_id, name, organization, department, laptop_name, laptop_color, serial_number, visitor_type, check_in, status, context)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'intern') RETURNING *`,
        [visitorId, profile.name, profile.organization, profile.department, profile.laptopName, profile.laptopColor, profile.serialNumber, profile.visitorType, Date.now(), VisitorStatus.ATTENDED]
      );

      return response.status(200).json({ success: true, action: "attended", log: mapLog(ins[0]) });
    }

    // 3. Gate / Event Check-out if already IN today
    const relevant = visitorLogs.find(l => eventId ? l.eventId === eventId : l.context === "gate");
    if (relevant && relevant.status === VisitorStatus.IN && !relevant.checkOut && isToday(relevant.checkIn)) {
      const checkOut = Date.now();
      const durMs = checkOut - relevant.checkIn;
      const h = Math.floor(durMs / 3600000);
      const m = Math.floor((durMs % 3600000) / 60000);
      const s = Math.floor((durMs % 60000) / 1000);
      const duration = `${h}h ${m}m ${s}s`;

      const { rows: upd } = await client.query(
        `UPDATE visitor_logs SET check_out = $1, status = $2, duration = $3 WHERE id = $4 RETURNING *`,
        [checkOut, VisitorStatus.OUT, duration, relevant.id]
      );

      return response.status(200).json({ success: true, action: "checkout", log: mapLog(upd[0]) });
    }

    // 4. Otherwise check-in
    const profile = consolidateProfile(visitorLogs);
    const eventName = eventId ? await getEventName(client, eventId as string) : null;

    const { rows: ins } = await client.query(
      `INSERT INTO visitor_logs (visitor_id, name, organization, department, laptop_name, laptop_color, serial_number, visitor_type, check_in, status, event_id, event_name, context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [visitorId, profile.name, profile.organization, profile.department, profile.laptopName, profile.laptopColor, profile.serialNumber, profile.visitorType, Date.now(), VisitorStatus.IN, eventId ?? null, eventName, eventId ? "event" : context]
    );

    return response.status(200).json({ success: true, action: "checkin", log: mapLog(ins[0]) });

  } catch (err) {
    console.error("❗ Scan API crashed:", err);
    return response.status(500).json({ success: false, error: "Internal Server Error", details: String(err) });
  } finally {
    await client.end();
  }
}

// Helpers from your original code (kept intact)
function consolidateProfile(logs: any[]) {
  const ok = (v: any) => v && v !== "Unknown" && v !== "";
  return logs.reduce((a, l) => ({
    name: ok(l.name) ? l.name : a.name,
    organization: ok(l.organization) ? l.organization : a.organization,
    department: ok(l.department) ? l.department : a.department,
    laptopName: ok(l.laptopName) ? l.laptopName : a.laptopName,
    laptopColor: ok(l.laptopColor) ? l.laptopColor : a.laptopColor,
    serialNumber: ok(l.serialNumber) ? l.serialNumber : a.serialNumber,
    visitorType: ok(l.visitorType) ? l.visitorType : a.visitorType,
  }), { name:"Unknown", organization:"", department:"", laptopName:"", laptopColor:"", serialNumber:"", visitorType:undefined });
}

async function getEventName(client: any, id: string) {
  try {
    const { rows } = await client.query("SELECT name FROM events WHERE id = $1", [id]);
    return rows[0]?.name;
  } catch {
    return null;
  }
}
