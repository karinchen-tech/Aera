import { promises as fs } from "node:fs";
import path from "node:path";
import type { Client, WorkEvent } from "../types";
import type { Store } from "./types";

interface Db {
  clients: Client[];
  events: WorkEvent[];
}

/**
 * JSON-file store for local development and demos. Not for production:
 * serverless hosts (Vercel) don't keep files between requests. Set DATABASE_URL.
 */
export class FileStore implements Store {
  private file: string;
  private cache: Db | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dir = process.env.DATA_DIR || path.join(process.cwd(), "data")) {
    this.file = path.join(dir, "aera-db.json");
  }

  private async load(): Promise<Db> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs.readFile(this.file, "utf8")) as Db;
    } catch {
      this.cache = { clients: [], events: [] };
    }
    return this.cache;
  }

  private write<T>(fn: (db: Db) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.load();
      const result = fn(db);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db));
      await fs.rename(tmp, this.file);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async listClients() {
    return [...(await this.load()).clients].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getClientBySlug(slug: string) {
    return (await this.load()).clients.find((c) => c.slug === slug) ?? null;
  }
  async getClientByIngestToken(token: string) {
    return (await this.load()).clients.find((c) => c.ingestToken === token) ?? null;
  }
  async createClient(client: Client) {
    await this.write((db) => {
      if (db.clients.some((c) => c.slug === client.slug)) throw new Error("slug_taken");
      db.clients.push(client);
    });
  }
  async insertEvents(events: WorkEvent[]) {
    return this.write((db) => {
      const seen = new Set(
        db.events.filter((e) => e.externalId).map((e) => `${e.clientId}|${e.externalId}`),
      );
      let n = 0;
      for (const e of events) {
        const k = e.externalId ? `${e.clientId}|${e.externalId}` : null;
        if (k && seen.has(k)) continue;
        if (k) seen.add(k);
        db.events.push(e);
        n++;
      }
      return n;
    });
  }
  async listEvents(clientId: string, since: string) {
    return (await this.load()).events
      .filter((e) => e.clientId === clientId && e.occurredAt >= since)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }
}
