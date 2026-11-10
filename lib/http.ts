import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

type OriginHeaders = Pick<Headers, "get">;

/** Evaluates browser origin against proxy, canonical URL, and referrer evidence. */
export function isSameOriginRequest(requestHeaders: OriginHeaders): boolean {
  const rawOrigin = requestHeaders.get("origin");
  if (!rawOrigin) return false;

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) return false;
  } catch {
    return false;
  }

  const host = requestHeaders.get("host");
  if (host && origin.host.toLowerCase() === host.toLowerCase()) return true;

  for (const configuredUrl of [process.env.NEXTAUTH_URL, process.env.AUTH_URL]) {
    if (!configuredUrl) continue;
    try {
      if (origin.origin === new URL(configuredUrl).origin) return true;
    } catch {
      continue;
    }
  }

  const rawReferer = requestHeaders.get("referer");
  if (!rawReferer || requestHeaders.get("sec-fetch-site") !== "same-origin") return false;
  try {
    return origin.origin === new URL(rawReferer).origin;
  } catch {
    return false;
  }
}

/**
 * Rejects cross-site mutation requests. Auth.js handles its own CSRF tokens;
 * this guard protects the application's JSON and upload endpoints.
 */
export async function hasSameOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOriginRequest(requestHeaders);
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function getClientAddress(request: Request): string {
  return getClientAddressFromHeaders({
    "x-real-ip": request.headers.get("x-real-ip") || undefined,
    "x-forwarded-for": request.headers.get("x-forwarded-for") || undefined,
  });
}

/** Uses platform-provided address headers and ignores malformed/spoofed values. */
export function getClientAddressFromHeaders(
  requestHeaders: Record<string, string | string[] | undefined>,
): string {
  const normalize = (value: string | string[] | undefined) => {
    const candidate = (Array.isArray(value) ? value[0] : value)?.trim();
    return candidate && isIP(candidate) ? candidate : undefined;
  };

  const realIp = normalize(requestHeaders["x-real-ip"]);
  if (realIp) return realIp;

  const forwardedFor = requestHeaders["x-forwarded-for"];
  const candidates = (Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor || "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => isIP(address));

  return candidates.at(-1) || "unknown";
}

/** Reads JSON with a hard byte limit so chunked requests cannot bypass size checks. */
export async function readJsonBody(
  request: Request,
  maximumBytes = 64 * 1024,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; message: string }> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maximumBytes) return { ok: false, status: 413, message: "Request body is too large." };
  if (!request.body) return { ok: false, status: 400, message: "A JSON request body is required." };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      return { ok: false, status: 413, message: "Request body is too large." };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, message: "Request body must be valid JSON." };
  }
}
