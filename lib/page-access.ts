import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "momenique_page_access";
const COOKIE_MAX_AGE = 60 * 60 * 12;

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be configured for private page access.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Issues a 12-hour, HttpOnly cookie scoped cryptographically to one page ID. */
export function setPageAccessCookie(response: NextResponse, experienceId: string, accessCodeHash: string): void {
  const codeVersion = createHash("sha256").update(accessCodeHash).digest("base64url");
  const payload = `${experienceId}.${Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE}.${codeVersion}`;
  response.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/** Verifies that the current recipient cookie grants access to this page. */
export async function hasPageAccess(experienceId: string, accessCodeHash?: string | null): Promise<boolean> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value || !accessCodeHash) return false;
  const [id, expires, codeVersion, signature, ...rest] = value.split(".");
  if (!id || !expires || !codeVersion || !signature || rest.length || id !== experienceId) return false;
  const expectedVersion = createHash("sha256").update(accessCodeHash).digest("base64url");
  if (codeVersion !== expectedVersion) return false;
  const payload = `${id}.${expires}.${codeVersion}`;
  if (!/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export { COOKIE_NAME };
