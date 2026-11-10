import { createHash, createHmac } from "node:crypto";
import { getDb } from "@/lib/db";

/**
 * Applies a fixed-window MongoDB rate limit shared by all application
 * instances. The key is hashed so raw IP addresses are not retained.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  maximum: number,
  windowMs: number,
): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be configured before rate limiting can run.");

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = createHmac("sha256", secret).update(`${scope}:${identifier}`).digest("hex");
  const id = createHash("sha256").update(`${key}:${windowStart}`).digest("hex");
  const db = await getDb();
  const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("rateLimits");
  const result = await collection.updateOne(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs * 2) } },
    { upsert: true },
  );
  const record = await collection.findOne({ _id: id });
  return result.acknowledged && typeof record?.count === "number" && record.count <= maximum;
}

/** Limits account-wide volume as well as requests from the same account/IP. */
export async function checkAccountRateLimit(
  scope: string,
  accountId: string,
  clientAddress: string,
  maximum: number,
  windowMs: number,
): Promise<boolean> {
  const [accountAllowed, addressAllowed] = await Promise.all([
    checkRateLimit(`${scope}-account`, accountId, maximum, windowMs),
    checkRateLimit(`${scope}-address`, `${accountId}:${clientAddress}`, maximum, windowMs),
  ]);
  return accountAllowed && addressAllowed;
}
