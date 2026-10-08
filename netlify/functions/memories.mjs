import { getDatabase } from "@netlify/database";

const db = getDatabase();
const MAX_TEXT = 500;
const VALID_AUTHORS = new Set(["caleb", "cassie"]);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function authorized(req) {
  const expected = process.env.CALENDAR_ACCESS_CODE;
  if (!expected) return false;
  return req.headers.get("x-calendar-code") === expected;
}

function validDate(value) {
  return typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(value);
}

async function body(req) {
  try { return await req.json(); } catch { return null; }
}

export default async (req) => {
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop();

    if (req.method === "GET") {
      const memories = await db.sql`
        SELECT id, memory_date, author, text, created_at
        FROM memories
        ORDER BY memory_date ASC, created_at ASC
      `;
      return json({ memories });
    }

    if (req.method === "POST") {
      const data = await body(req);
      if (!validDate(data?.memory_date) || !VALID_AUTHORS.has(data?.author) || typeof data?.text !== "string") {
        return json({ error: "Please provide a valid date, author, and memory." }, 400);
      }
      const text = data.text.trim();
      if (!text || text.length > MAX_TEXT) return json({ error: `Memory must be between 1 and ${MAX_TEXT} characters.` }, 400);
      const rows = await db.sql`
        INSERT INTO memories (memory_date, author, text)
        VALUES (${data.memory_date}, ${data.author}, ${text})
        RETURNING id, memory_date, author, text, created_at
      `;
      return json({ memory: rows[0] }, 201);
    }

    if ((req.method === "PUT" || req.method === "DELETE") && !id) return json({ error: "Missing memory id." }, 400);

    if (req.method === "PUT") {
      const data = await body(req);
      if (!validDate(data?.memory_date) || !VALID_AUTHORS.has(data?.author) || typeof data?.text !== "string") return json({ error: "Invalid memory." }, 400);
      const text = data.text.trim();
      if (!text || text.length > MAX_TEXT) return json({ error: `Memory must be between 1 and ${MAX_TEXT} characters.` }, 400);
      const rows = await db.sql`
        UPDATE memories
        SET memory_date = ${data.memory_date}, author = ${data.author}, text = ${text}
        WHERE id = ${id}
        RETURNING id, memory_date, author, text, created_at
      `;
      if (!rows.length) return json({ error: "Memory not found." }, 404);
      return json({ memory: rows[0] });
    }

    if (req.method === "DELETE") {
      const rows = await db.sql`DELETE FROM memories WHERE id = ${id} RETURNING id`;
      if (!rows.length) return json({ error: "Memory not found." }, 404);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: "The calendar database had a problem. Check your Netlify function logs." }, 500);
  }
};

export const config = { path: "/.netlify/functions/memories/:id?" };
