import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(20).max(100),
  password: z.string().min(12).max(128),
}).strict();

/** Consumes a single-use reset token, stores a password hash, and revokes sessions. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  if (!(await checkRateLimit("password-reset-confirm-ip", getClientAddress(request), 10, 60 * 60 * 1000))) {
    return apiError("Too many password reset attempts. Try again later.", 429);
  }
  const parsedBody = await readJsonBody(request, 2 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Use a new password with at least 12 characters.", 400);

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const db = await getDb();
  const collection = db.collection("passwordResetTokens");
  const reset = await collection.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!reset) return apiError("That reset link is invalid or expired. Request a new one.", 400);

  const result = await db.collection("users").updateOne(
    { _id: reset.userId, status: "active", emailVerified: { $ne: null } },
    { $set: { passwordHash: await hash(parsed.data.password, 12), updatedAt: new Date() }, $inc: { authVersion: 1 } },
  );
  if (!result.modifiedCount) return apiError("That reset link is invalid or expired. Request a new one.", 400);
  await collection.deleteMany({ userId: reset.userId });
  return NextResponse.json({ changed: true });
}
