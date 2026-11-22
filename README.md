# AERA Work Portal

A client-facing dashboard that shows companies **the actual work your automations do for them**, live:
every CRM record created, every WhatsApp message the AI agent answered, every missed call that got a text back,
plus the hours and money that work saved.

- **Clients** open a private link and see: hours saved, value of time saved, actions, leads captured,
  work handled after hours, a per-day chart, each automation's status, and a searchable log of every action.
  Hebrew (RTL) and English; works on mobile; "Download report" prints a PDF.
- **You** (in `/admin`) create a client, copy its **ingest token** into your automations, and send them their link.
- **Automations** (Make, n8n, Zapier, your own code) add one HTTP step: `POST /api/events`.

## Run it locally

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD
npm run dev
```

- Demo dashboard: http://localhost:3000 → company ID `demo-realestate`, key `demo`
- Admin: http://localhost:3000/admin

Without `DATABASE_URL` data is stored in `data/aera-db.json` (local testing only).

## Deploy (Vercel + Postgres)

1. Create a Postgres database (Neon, Supabase or Vercel Postgres) and copy its connection string.
2. Import this repo in Vercel and set the environment variables:
   `ADMIN_PASSWORD`, `DATABASE_URL`, and `SEED_DEMO=false` if you don't want the demo client.
3. Tables are created automatically on first request (schema: `src/lib/store/postgres.ts`).

## Reporting work from an automation

```http
POST /api/events
Authorization: Bearer <client ingest token>
Content-Type: application/json

{
  "type": "crm.listing_created",
  "title": "New listing: 4 rooms, Herzl 12, Ramat Gan",
  "detail": "Price ₪2.9M · owner details saved",
  "contact_name": "Dana Levi",
  "contact_phone": "050-1234567",
  "link": "https://airtable.com/appXXX/tblXXX/recXXX",
  "external_id": "recXXX"
}
```

Only `type` is required. See [docs/integrations.md](docs/integrations.md) for every field, the built-in
event types, and step-by-step recipes for the CRM, WhatsApp agent and missed-call automations.
