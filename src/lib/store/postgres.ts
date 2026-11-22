import postgres from "postgres";
import type { Client, WorkEvent } from "../types";
import type { Store } from "./types";

const SCHEMA = `
create table if not exists clients (
  id text primary key,
  slug text unique not null,
  name text not null,
  industry text not null default '',
  lang text not null default 'he',
  timezone text not null default 'Asia/Jerusalem',
  hourly_rate numeric not null default 100,
  currency text not null default 'ILS',
  access_key text not null,
  ingest_token text unique not null,
  created_at timestamptz not null default now()
);
create table if not exists events (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  automation text not null,
  type text not null,
  title text not null,
  detail text,
  contact_name text,
  contact_phone text,
  outcome text not null default 'success',
  minutes_saved numeric not null default 0,
  link text,
  external_id text,
  meta jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists events_client_time on events (client_id, occurred_at desc);
create unique index if not exists events_client_external on events (client_id, external_id) where external_id is not null;
`;

type Row = Record<string, any>;

const toClient = (r: Row): Client => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  industry: r.industry,
  lang: r.lang,
  timezone: r.timezone,
  hourlyRate: Number(r.hourly_rate),
  currency: r.currency,
  accessKey: r.access_key,
  ingestToken: r.ingest_token,
  createdAt: new Date(r.created_at).toISOString(),
});

const toEvent = (r: Row): WorkEvent => ({
  id: r.id,
  clientId: r.client_id,
  automation: r.automation,
  type: r.type,
  title: r.title,
  detail: r.detail ?? undefined,
  contactName: r.contact_name ?? undefined,
  contactPhone: r.contact_phone ?? undefined,
  outcome: r.outcome,
  minutesSaved: Number(r.minutes_saved),
  link: r.link ?? undefined,
  externalId: r.external_id ?? undefined,
  meta: r.meta ?? undefined,
  occurredAt: new Date(r.occurred_at).toISOString(),
  createdAt: new Date(r.created_at).toISOString(),
});

export class PostgresStore implements Store {
  private sql: postgres.Sql;
  private ready: Promise<void>;

  constructor(url: string) {
    this.sql = postgres(url, { max: 5, ssl: url.includes("localhost") ? false : "require" });
    this.ready = this.sql.unsafe(SCHEMA).then(() => undefined);
  }

  async listClients() {
    await this.ready;
    return (await this.sql`select * from clients order by name`).map(toClient);
  }
  async getClientBySlug(slug: string) {
    await this.ready;
    const [r] = await this.sql`select * from clients where slug = ${slug}`;
    return r ? toClient(r) : null;
  }
  async getClientByIngestToken(token: string) {
    await this.ready;
    const [r] = await this.sql`select * from clients where ingest_token = ${token}`;
    return r ? toClient(r) : null;
  }
  async createClient(c: Client) {
    await this.ready;
    try {
      await this.sql`insert into clients ${this.sql({
        id: c.id, slug: c.slug, name: c.name, industry: c.industry, lang: c.lang,
        timezone: c.timezone, hourly_rate: c.hourlyRate, currency: c.currency,
        access_key: c.accessKey, ingest_token: c.ingestToken, created_at: c.createdAt,
      })}`;
    } catch (e: any) {
      if (e?.code === "23505") throw new Error("slug_taken");
      throw e;
    }
  }
  async insertEvents(events: WorkEvent[]) {
    await this.ready;
    if (!events.length) return 0;
    const rows = events.map((e) => ({
      id: e.id, client_id: e.clientId, automation: e.automation, type: e.type, title: e.title,
      detail: e.detail ?? null, contact_name: e.contactName ?? null, contact_phone: e.contactPhone ?? null,
      outcome: e.outcome, minutes_saved: e.minutesSaved, link: e.link ?? null,
      external_id: e.externalId ?? null, meta: e.meta ? this.sql.json(e.meta as any) : null,
      occurred_at: e.occurredAt, created_at: e.createdAt,
    }));
    let n = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const res = await this.sql`insert into events ${this.sql(rows.slice(i, i + 200))} on conflict do nothing`;
      n += res.count;
    }
    return n;
  }
  async listEvents(clientId: string, since: string) {
    await this.ready;
    return (
      await this.sql`select * from events where client_id = ${clientId} and occurred_at >= ${since}
                     order by occurred_at desc limit 20000`
    ).map(toEvent);
  }
}
