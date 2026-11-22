import { NextResponse } from "next/server";
import { clientCookie, keyCookieValue } from "@/lib/auth";
import { safeEqual } from "@/lib/ids";
import { getStore } from "@/lib/store";

async function enter(req: Request, slug: string, key: string | null) {
  const store = await getStore();
  const client = await store.getClientBySlug(slug.trim().toLowerCase());
  if (!client || !safeEqual(key?.trim(), client.accessKey)) {
    return NextResponse.redirect(new URL(`/?error=1`, req.url), 303);
  }
  const res = NextResponse.redirect(new URL(`/c/${client.slug}`, req.url), 303);
  res.cookies.set(clientCookie(client.slug), keyCookieValue(client.accessKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}

/** Magic link you can send a client: /c/<slug>/enter?key=<access key> */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return enter(req, slug, new URL(req.url).searchParams.get("key"));
}

/** Login form on the home page posts here. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await req.formData();
  return enter(req, String(form.get("slug") || slug), String(form.get("key") ?? ""));
}
