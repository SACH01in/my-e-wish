import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin } from "@/lib/http";
import { createMfaEnrollment, encryptMfaSecret } from "@/lib/mfa";
import { checkAccountRateLimit } from "@/lib/rate-limit";

/** Creates a short-lived pending TOTP enrollment for an authenticated admin. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["support_admin", "super_admin"].includes(session.user.role)) return apiError("Administrator access is required.", 403);
  if (session.user.mfaEnabled) return apiError("Multi-factor authentication is already enabled.", 409);
  if (!(await checkAccountRateLimit("mfa-enrollment-setup", session.user.id, getClientAddress(request), 5, 60 * 60 * 1000))) {
    return apiError("Too many MFA setup attempts. Try again later.", 429);
  }

  const enrollment = await createMfaEnrollment(session.user.email || "admin");
  const db = await getDb();
  const updated = await db.collection("users").updateOne(
    { _id: new (await import("mongodb")).ObjectId(session.user.id), role: { $in: ["support_admin", "super_admin"] }, mfaEnabled: { $ne: true } },
    { $set: { pendingMfaSecret: encryptMfaSecret(enrollment.secret), pendingMfaExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } },
  );
  if (!updated.modifiedCount) return apiError("MFA setup could not be started. Please sign in again.", 409);
  return NextResponse.json({ qrCode: enrollment.qrCode, secret: enrollment.secret, expiresInMinutes: 10 });
}
