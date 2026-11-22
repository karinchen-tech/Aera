// Usage: AERA_URL=http://localhost:3000 AERA_TOKEN=ingest_xxx node scripts/send-test-event.mjs
const url = process.env.AERA_URL || "http://localhost:3000";
const token = process.env.AERA_TOKEN;
if (!token) {
  console.error("Set AERA_TOKEN to a client's ingest token (copy it from /admin).");
  process.exit(1);
}
const res = await fetch(`${url}/api/events`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify([
    { type: "crm.listing_created", title: "New listing: 4 rooms, Herzl 12, Ramat Gan", link: "https://airtable.com/", external_id: `test-${Date.now()}` },
    { type: "whatsapp.viewing_booked", contact_name: "Dana Levi", contact_phone: "050-1234567", detail: "Viewing booked for Thursday 17:00" },
    { type: "call.missed_text_sent", contact_phone: "052-7654321" },
  ]),
});
console.log(res.status, await res.json());
