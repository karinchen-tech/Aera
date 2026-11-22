import { cookies } from "next/headers";
import { safeEqual, sha256 } from "./ids";
import type { Client } from "./types";

export const clientCookie = (slug: string) => `aera_c_${slug}`;
export const ADMIN_COOKIE = "aera_admin";

/** Cookie holds a hash of the access key, never the key itself. */
export const keyCookieValue = (accessKey: string) => sha256(`client:${accessKey}`);

export async function canViewClient(client: Client): Promise<boolean> {
  const jar = await cookies();
  return safeEqual(jar.get(clientCookie(client.slug))?.value, keyCookieValue(client.accessKey))
    || (await isAdmin());
}

export const adminCookieValue = () =>
  process.env.ADMIN_PASSWORD ? sha256(`admin:${process.env.ADMIN_PASSWORD}`) : null;

export async function isAdmin(): Promise<boolean> {
  const expected = adminCookieValue();
  if (!expected) return false;
  return safeEqual((await cookies()).get(ADMIN_COOKIE)?.value, expected);
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return req.headers.get("x-aera-token");
}
