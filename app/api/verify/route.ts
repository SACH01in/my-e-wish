import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getClientAddress, hasSameOrigin, apiError, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";

/** Consumes a single-use, time-limited email verification token. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  if (!(await checkRateLimit("verify-ip", getClientAddress(request), 10, 60 * 60 * 1000))) {
    return apiError("Too many verification attempts. Try again later.", 429);
  }
  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const token = body && typeof body === "object" && "token" in body && typeof body.token === "string" ? body.token : "";
  if (!token || token.length > 100) return apiError("That verification link is invalid or expired.", 400);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = await getDb();
  const verification = await db.collection("verificationTokens").findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!verification) return apiError("That verification link is invalid or expired.", 400);

  const result = await db.collection("users").updateOne(
    { _id: verification.userId, emailVerified: null },
    { $set: { emailVerified: new Date(), updatedAt: new Date() } },
  );
  await db.collection("verificationTokens").deleteOne({ _id: verification._id });
  if (!result.modifiedCount) return apiError("That verification link is invalid or expired.", 400);
  return NextResponse.json({ verified: true });
}
