export type Lang = "he" | "en";
export type Outcome = "success" | "failed" | "needs_human";

export interface Client {
  id: string;
  slug: string;
  name: string;
  industry: string;
  lang: Lang;
  timezone: string;
  /** What one hour of staff time is worth to this client, used for "value saved". */
  hourlyRate: number;
  currency: string;
  /** Secret the client uses to open their dashboard. */
  accessKey: string;
  /** Secret your automations (Make / n8n / Zapier) use to report work. */
  ingestToken: string;
  createdAt: string;
}

export interface WorkEvent {
  id: string;
  clientId: string;
  /** Which automation did the work, e.g. "whatsapp", "crm", "missed-call". */
  automation: string;
  /** What kind of work, e.g. "crm.listing_created". See catalog.ts. */
  type: string;
  title: string;
  detail?: string;
  contactName?: string;
  contactPhone?: string;
  outcome: Outcome;
  minutesSaved: number;
  /** Deep link to the record (Airtable row, WhatsApp chat, call recording...). */
  link?: string;
  /** Sender-side id so retries from Make/n8n never double count. */
  externalId?: string;
  meta?: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}
