import { automationFor, EVENT_TYPES, typeLabel } from "./catalog";
import { newId } from "./ids";
import type { Client, Outcome, WorkEvent } from "./types";

const OUTCOMES: Outcome[] = ["success", "failed", "needs_human"];
const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

export type IngestResult = { ok: true; event: WorkEvent } | { ok: false; error: string };

/**
 * Turns one JSON payload from Make / n8n / Zapier into a WorkEvent.
 * Accepts snake_case or camelCase keys so it is forgiving to wire up.
 */
export function normalizeEvent(client: Client, raw: unknown): IngestResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "event must be an object" };
  const p = raw as Record<string, unknown>;
  const pick = (a: string, b?: string) => p[a] ?? (b ? p[b] : undefined);

  const type = str(p.type, 80);
  if (!type || !/^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i.test(type))
    return { ok: false, error: "`type` is required and must look like \"whatsapp.message_answered\"" };

  let occurredAt = new Date();
  const when = pick("occurred_at", "occurredAt");
  if (when !== undefined) {
    const d = new Date(when as string | number);
    if (isNaN(d.getTime())) return { ok: false, error: "`occurred_at` is not a valid date" };
    occurredAt = d;
  }

  const outcomeRaw = str(p.outcome, 20) ?? "success";
  if (!OUTCOMES.includes(outcomeRaw as Outcome))
    return { ok: false, error: "`outcome` must be success, failed or needs_human" };

  const minutesRaw = pick("minutes_saved", "minutesSaved");
  const minutes =
    minutesRaw === undefined || minutesRaw === null || minutesRaw === ""
      ? EVENT_TYPES[type]?.minutes ?? 5
      : Number(minutesRaw);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 600)
    return { ok: false, error: "`minutes_saved` must be a number between 0 and 600" };

  const link = str(p.link, 1000);
  if (link && !/^https?:\/\//i.test(link)) return { ok: false, error: "`link` must be an http(s) URL" };

  let meta: Record<string, unknown> | undefined;
  if (p.meta && typeof p.meta === "object" && !Array.isArray(p.meta)) {
    if (JSON.stringify(p.meta).length > 4000) return { ok: false, error: "`meta` is too large (4KB max)" };
    meta = p.meta as Record<string, unknown>;
  }

  const ext = pick("external_id", "externalId");
  const now = new Date().toISOString();
  return {
    ok: true,
    event: {
      id: newId(),
      clientId: client.id,
      automation: str(p.automation, 60) ?? automationFor(type),
      type,
      title: str(p.title, 200) ?? typeLabel(type, client.lang),
      detail: str(p.detail, 2000),
      contactName: str(pick("contact_name", "contactName"), 120),
      contactPhone: str(pick("contact_phone", "contactPhone"), 40),
      outcome: outcomeRaw as Outcome,
      minutesSaved: Math.round(minutes * 10) / 10,
      link,
      externalId: ext === undefined || ext === null ? undefined : String(ext).slice(0, 200),
      meta,
      occurredAt: occurredAt.toISOString(),
      createdAt: now,
    },
  };
}
