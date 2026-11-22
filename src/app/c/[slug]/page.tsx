import { notFound, redirect } from "next/navigation";
import { canViewClient } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { buildSummary } from "@/lib/summary";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (sp.key) redirect(`/c/${slug}/enter?key=${encodeURIComponent(sp.key)}`);

  const store = await getStore();
  const client = await store.getClientBySlug(slug);
  if (!client) notFound();
  if (!(await canViewClient(client))) redirect(`/?slug=${encodeURIComponent(slug)}`);

  const summary = await buildSummary(store, client, 30);
  return <Dashboard initial={summary} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await (await getStore()).getClientBySlug(slug);
  return { title: client ? `${client.name} · AERA` : "AERA" };
}
