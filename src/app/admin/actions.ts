"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { ADMIN_COOKIE, adminCookieValue, isAdmin } from "@/lib/auth";
import { newId, newSecret, safeEqual } from "@/lib/ids";
import { normalizeEvent } from "@/lib/ingest";
import { getStore } from "@/lib/store";
import type { Client, Lang, WorkEvent } from "@/lib/types";

export async function login(form: FormData) {
  const expected = adminCookieValue();
  if (!expected || !safeEqual(String(form.get("password") ?? ""), process.env.ADMIN_PASSWORD)) {
    redirect("/admin?error=1");
  }
  (await cookies()).set(ADMIN_COOKIE, expected, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

const readableKey = () => randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);

export async function createClient(form: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const slug = String(form.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  if (!name || !slug || slug === "_") redirect("/admin?error=fields");
  const rate = Number(form.get("hourlyRate"));
  const client: Client = {
    id: newId(),
    slug,
    name,
    industry: String(form.get("industry") ?? "").trim().slice(0, 60),
    lang: (form.get("lang") === "en" ? "en" : "he") as Lang,
    timezone: String(form.get("timezone") || "Asia/Jerusalem"),
    hourlyRate: Number.isFinite(rate) && rate >= 0 ? rate : 100,
    currency: String(form.get("currency") || "ILS").toUpperCase().slice(0, 3),
    accessKey: readableKey(),
    ingestToken: newSecret("ingest"),
    createdAt: new Date().toISOString(),
  };
  try {
    Intl.DateTimeFormat("en", { timeZone: client.timezone });
    new Intl.NumberFormat("en", { style: "currency", currency: client.currency });
  } catch {
    redirect("/admin?error=locale");
  }
  try {
    await (await getStore()).createClient(client);
  } catch (e) {
    redirect(`/admin?error=${(e as Error).message === "slug_taken" ? "slug" : "save"}`);
  }
  redirect(`/admin?created=${slug}#${slug}`);
}

export async function sendTestEvents(form: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const store = await getStore();
  const client = await store.getClientBySlug(String(form.get("slug")));
  if (!client) redirect("/admin");
  const samples = [
    { type: "crm.listing_created", title: "Test: new listing added to Airtable", detail: "Sent from the admin page to check the connection" },
    { type: "whatsapp.message_answered", contact_name: "Test Contact", contact_phone: "050-0000000", detail: "“Is this still available?” — answered in 8s" },
    { type: "call.missed_text_sent", contact_phone: "050-0000000", detail: "SMS sent: “Sorry we missed you, how can we help?”" },
  ];
  const events = samples.map((s) => normalizeEvent(client, s)).filter((r) => r.ok).map((r) => (r as { event: WorkEvent }).event);
  await store.insertEvents(events);
  redirect(`/admin?tested=${client.slug}#${client.slug}`);
}
