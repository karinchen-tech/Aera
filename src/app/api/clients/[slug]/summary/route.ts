import { NextResponse } from "next/server";
import { canViewClient } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { buildSummary, RANGES } from "@/lib/summary";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore();
  const client = await store.getClientBySlug(slug);
  if (!client || !(await canViewClient(client))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days"));
  const lang = url.searchParams.get("lang");
  const summary = await buildSummary(
    store,
    client,
    (RANGES as readonly number[]).includes(days) ? days : 30,
    lang === "en" || lang === "he" ? (lang as Lang) : client.lang,
  );
  return NextResponse.json(summary, { headers: { "cache-control": "no-store" } });
}
