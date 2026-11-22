import { AUTOMATIONS, automationInfo, EVENT_TYPES } from "./catalog";
import type { Store } from "./store/types";
import type { Client, Lang, WorkEvent } from "./types";

export interface Kpis {
  actions: number;
  hoursSaved: number;
  valueSaved: number;
  leads: number;
  afterHours: number;
  needsAttention: number;
}

export interface AutomationSummary {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
  hoursSaved: number;
  lastAt: string | null;
  failures: number;
  status: "active" | "idle" | "attention";
}

export type FeedItem = Omit<WorkEvent, "clientId" | "meta" | "externalId" | "createdAt">;

export interface Summary {
  client: Pick<Client, "name" | "slug" | "lang" | "currency" | "timezone" | "industry">;
  days: number;
  generatedAt: string;
  kpis: Kpis;
  previous: Kpis;
  automations: AutomationSummary[];
  daily: { date: string; counts: Record<string, number>; total: number }[];
  feed: FeedItem[];
}

export const RANGES = [7, 30, 90] as const;

function localParts(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), weekday: get("weekday") };
}

/** Outside 09:00–19:00, or on Saturday, in the client's own time zone. */
export function isAfterHours(iso: string, tz: string) {
  const { hour, weekday } = localParts(iso, tz);
  return hour < 9 || hour >= 19 || weekday === "Sat";
}

function kpisOf(events: WorkEvent[], client: Client): Kpis {
  let minutes = 0, actions = 0, leads = 0, afterHours = 0, needsAttention = 0;
  for (const e of events) {
    if (e.outcome !== "success") needsAttention++;
    if (e.outcome === "failed") continue;
    actions++;
    minutes += e.minutesSaved;
    if (EVENT_TYPES[e.type]?.lead || e.meta?.lead === true) leads++;
    if (isAfterHours(e.occurredAt, client.timezone)) afterHours++;
  }
  const hoursSaved = Math.round((minutes / 60) * 10) / 10;
  return { actions, hoursSaved, valueSaved: Math.round(hoursSaved * client.hourlyRate), leads, afterHours, needsAttention };
}

export async function buildSummary(store: Store, client: Client, days: number, lang: Lang = client.lang): Promise<Summary> {
  const now = Date.now();
  const since = new Date(now - days * 864e5).toISOString();
  const prevSince = new Date(now - 2 * days * 864e5).toISOString();
  const all = await store.listEvents(client.id, prevSince);
  const current = all.filter((e) => e.occurredAt >= since);
  const previous = all.filter((e) => e.occurredAt < since);

  // Per-automation rollup
  const byAuto = new Map<string, WorkEvent[]>();
  for (const e of current) byAuto.set(e.automation, [...(byAuto.get(e.automation) ?? []), e]);
  const lastEver = new Map<string, string>();
  for (const e of all) if (!lastEver.has(e.automation)) lastEver.set(e.automation, e.occurredAt);

  const automations = [...new Set([...byAuto.keys(), ...lastEver.keys()])].map((key): AutomationSummary => {
    const list = byAuto.get(key) ?? [];
    const info = automationInfo(key);
    const ok = list.filter((e) => e.outcome !== "failed");
    const lastAt = lastEver.get(key) ?? null;
    const recentFail = list.some((e) => e.outcome === "failed" && now - Date.parse(e.occurredAt) < 864e5);
    return {
      key,
      name: AUTOMATIONS[key] ? info.name[lang] : key,
      description: info.description[lang],
      icon: info.icon,
      color: info.color,
      count: ok.length,
      hoursSaved: Math.round((ok.reduce((s, e) => s + e.minutesSaved, 0) / 60) * 10) / 10,
      lastAt,
      failures: list.filter((e) => e.outcome === "failed").length,
      status: recentFail ? "attention" : !lastAt || now - Date.parse(lastAt) > 2 * 864e5 ? "idle" : "active",
    };
  }).sort((a, b) => b.count - a.count);

  // Daily buckets in the client's time zone, oldest → newest, no gaps.
  const daily = new Map<string, Record<string, number>>();
  for (let i = days - 1; i >= 0; i--) daily.set(localParts(new Date(now - i * 864e5).toISOString(), client.timezone).date, {});
  for (const e of current) {
    if (e.outcome === "failed") continue;
    const bucket = daily.get(localParts(e.occurredAt, client.timezone).date);
    if (bucket) bucket[e.automation] = (bucket[e.automation] ?? 0) + 1;
  }

  return {
    client: { name: client.name, slug: client.slug, lang: client.lang, currency: client.currency, timezone: client.timezone, industry: client.industry },
    days,
    generatedAt: new Date(now).toISOString(),
    kpis: kpisOf(current, client),
    previous: kpisOf(previous, client),
    automations,
    daily: [...daily].map(([date, counts]) => ({ date, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) })),
    feed: current.slice(0, 300).map(({ clientId, meta, externalId, createdAt, ...rest }) => rest),
  };
}
