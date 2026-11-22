import { NextResponse } from "next/server";
import { bearer } from "@/lib/auth";
import { normalizeEvent } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import type { WorkEvent } from "@/lib/types";

const MAX_BATCH = 500;

/**
 * Automations report work here.
 *   POST /api/events
 *   Authorization: Bearer <client ingest token>
 *   Body: one event, an array of events, or { "events": [...] }
 */
export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "missing token: send Authorization: Bearer <ingest token>" }, { status: 401 });

  const store = await getStore();
  const client = await store.getClientByIngestToken(token);
  if (!client) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const list: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)
      ? (body as { events: unknown[] }).events
      : [body];
  if (list.length === 0) return NextResponse.json({ error: "no events" }, { status: 400 });
  if (list.length > MAX_BATCH) return NextResponse.json({ error: `max ${MAX_BATCH} events per request` }, { status: 413 });

  const valid: WorkEvent[] = [];
  const errors: { index: number; error: string }[] = [];
  list.forEach((raw, index) => {
    const r = normalizeEvent(client, raw);
    if (r.ok) valid.push(r.event);
    else errors.push({ index, error: r.error });
  });

  const stored = valid.length ? await store.insertEvents(valid) : 0;
  const status = valid.length === 0 ? 400 : errors.length ? 207 : 201;
  return NextResponse.json(
    { stored, duplicates: valid.length - stored, errors, ids: valid.map((e) => e.id) },
    { status },
  );
}
