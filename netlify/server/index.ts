import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { rosters } from "../../db/schema.ts";

const ROOM_RE = /^[a-z0-9_-]{1,64}$/;
const MAX_BYTES = 1_000_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/api\/roster\/([^/]+)\/?$/);
  if (!match) return json({ error: "Not found" }, 404);

  const roomId = decodeURIComponent(match[1]).toLowerCase();
  if (!ROOM_RE.test(roomId)) return json({ error: "Invalid room id" }, 400);

  try {
    if (req.method === "GET") {
      const since = Number(url.searchParams.get("since") || 0);
      const [row] = await db.select().from(rosters).where(eq(rosters.roomId, roomId)).limit(1);
      if (!row) return json({ exists: false, version: 0 });
      if (since && row.version <= since) return json({ exists: true, changed: false, version: row.version });
      return json({ exists: true, changed: true, version: row.version, senderId: row.senderId, payload: row.payload });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: "Payload too large" }, 413);
      let body: any;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const payload = body?.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json({ error: "Missing payload" }, 400);
      }
      const senderId = typeof body.senderId === "string" ? body.senderId.slice(0, 64) : "";

      // Version always moves forward, even if two writes land in the same millisecond.
      const now = Date.now();
      const [row] = await db
        .insert(rosters)
        .values({ roomId, payload, senderId, version: now })
        .onConflictDoUpdate({
          target: rosters.roomId,
          set: {
            payload,
            senderId,
            version: sql`GREATEST(${now}, ${rosters.version} + 1)`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ version: rosters.version });
      return json({ ok: true, version: row.version });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("Roster API error:", err);
    return json({ error: "Server error" }, 500);
  }
}

export const config = {
  path: "/api/*",
};
