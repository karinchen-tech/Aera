# Connecting automations

Every automation adds **one last step**: an HTTP request that tells the portal what it just did.

- URL: `https://<your-portal>/api/events`
- Method: `POST`
- Headers: `Authorization: Bearer <ingest token>` and `Content-Type: application/json`
- Body: one event, an array of events, or `{"events": [...]}` (max 500 per request)

The token is per client (copy it from `/admin` → "Show token"). Keep it in your automation tool's
secrets / connection settings, never in a client-facing place.

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | ✅ | What happened. Use a built-in type below, or your own like `email.followup_sent`. |
| `title` | | Short headline shown in the log. Defaults to the type's label in the client's language. |
| `detail` | | One or two lines of context (the question asked, the price, the SMS text). |
| `contact_name`, `contact_phone` | | Who it was for. |
| `link` | | `https://` link to the record (Airtable row, chat, recording). Shown as "Open ↗". |
| `outcome` | | `success` (default), `failed`, or `needs_human`. Non-success shows under "Needs your attention". |
| `minutes_saved` | | Override the default minutes of manual work this replaced. |
| `occurred_at` | | ISO date. Defaults to now. Use it when backfilling. |
| `external_id` | | Your own id (e.g. Airtable record id). Repeats with the same id are ignored, so retries never double count. |
| `automation` | | Group name. Normally derived from the type prefix (`crm.*`, `whatsapp.*`, `call.*`). |
| `meta` | | Any extra JSON (≤4KB). `{"lead": true}` makes a custom type count as a lead. |

Responses: `201` all stored, `207` some rejected (see `errors`), `400` nothing valid, `401` bad token.

## Built-in types

| Type | Automation | Default minutes | Lead |
|---|---|---|---|
| `crm.listing_created` | CRM Sync | 10 | |
| `crm.record_updated` | CRM Sync | 4 | |
| `crm.lead_created` | CRM Sync | 5 | ✅ |
| `whatsapp.message_answered` | WhatsApp AI Agent | 3 | |
| `whatsapp.lead_qualified` | WhatsApp AI Agent | 10 | ✅ |
| `whatsapp.viewing_booked` | WhatsApp AI Agent | 15 | ✅ |
| `whatsapp.handoff` | WhatsApp AI Agent | 2 | (send with `outcome: "needs_human"`) |
| `call.missed_text_sent` | Missed-Call Text Back | 5 | ✅ |
| `call.callback_booked` | Missed-Call Text Back | 10 | ✅ |
| `task.completed` | General | 5 | |

To add a type, edit `src/lib/catalog.ts`.

## Recipe 1 — New listing → Airtable CRM

Scenario (Make / n8n / Zapier): *trigger: new listing (form, email, website)* → *Airtable: create record* → **HTTP: POST /api/events**

```json
{
  "type": "crm.listing_created",
  "title": "New listing: {{rooms}} rooms, {{address}}",
  "detail": "Price {{price}} · owner {{owner_name}}",
  "link": "https://airtable.com/{{base_id}}/{{table_id}}/{{record_id}}",
  "external_id": "{{record_id}}"
}
```

## Recipe 2 — WhatsApp AI agent

After the agent replies (WhatsApp Cloud API / Twilio / Green API / ManyChat webhook → AI step → send reply):

```json
{
  "type": "whatsapp.message_answered",
  "contact_name": "{{profile_name}}",
  "contact_phone": "{{from}}",
  "detail": "“{{incoming_text}}” — answered in {{seconds}}s",
  "external_id": "{{message_id}}"
}
```

When the AI decides the lead is qualified / a viewing is booked / a human must take over, send
`whatsapp.lead_qualified`, `whatsapp.viewing_booked`, or `whatsapp.handoff` with `"outcome": "needs_human"`.
Tip: to avoid flooding the log, send `message_answered` once per conversation per hour instead of per message.

## Recipe 3 — Missed call → text back

Phone system webhook on missed call (Voicenter, Twilio, 3CX…) → send SMS/WhatsApp → **HTTP**:

```json
{
  "type": "call.missed_text_sent",
  "contact_phone": "{{caller}}",
  "detail": "SMS sent: “{{message}}”",
  "external_id": "{{call_id}}"
}
```

If sending failed, send the same event with `"outcome": "failed"` so the client and you see it.

## Test from the command line

```bash
AERA_URL=http://localhost:3000 AERA_TOKEN=ingest_xxx npm run test:ingest
```
