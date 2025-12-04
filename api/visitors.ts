import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/postgres"; // ✅ Pooled Vercel Postgres client
import { mapLog } from "./types";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL // ✅ Uses pooled Neon URL
  });

  try {
    await client.connect();

    if (request.method === "GET") {
      const { rows } = await client.query(
        `SELECT * FROM visitor_logs ORDER BY check_in DESC LIMIT 500`
      );
      return response.status(200).json({ success:
