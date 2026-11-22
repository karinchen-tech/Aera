import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export const newId = () => randomBytes(9).toString("base64url");
export const newSecret = (prefix: string) => `${prefix}_${randomBytes(24).toString("base64url")}`;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ha = Buffer.from(sha256(a));
  const hb = Buffer.from(sha256(b));
  return timingSafeEqual(ha, hb);
}
