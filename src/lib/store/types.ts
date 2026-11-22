import type { Client, WorkEvent } from "../types";

export interface Store {
  listClients(): Promise<Client[]>;
  getClientBySlug(slug: string): Promise<Client | null>;
  getClientByIngestToken(token: string): Promise<Client | null>;
  createClient(client: Client): Promise<void>;
  /** Inserts events, skipping any whose (clientId, externalId) already exists. Returns how many were stored. */
  insertEvents(events: WorkEvent[]): Promise<number>;
  /** Events for a client that occurred at/after `since`, newest first. */
  listEvents(clientId: string, since: string): Promise<WorkEvent[]>;
}
