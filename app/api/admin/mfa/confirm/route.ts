import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, hashRecoveryCode } from "@/lib/mfa";
import { verify } from "otplib";
import { checkAccountRateLimit } from "@/lib/rate-limit";

/** Enables admin MFA only after validating a live TOTP and returns recovery codes once. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["support_admin", "super_admin"].includes(session.user.role)) return apiError("Administrator access is required.", 403);
  if (session.user.mfaEnabled) return apiError("Multi-factor authentication is already enabled.", 409);
  if (!(await checkAccountRateLimit("mfa-enrollment", session.user.id, getClientAddress(request), 8, 15 * 60 * 1000))) {
    return apiError("Too many code attempts. Try again later.", 429);
  }
  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const token = body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : "";
  if (!/^\d{6}$/.test(token)) return apiError("Enter the six-digit code from your authenticator app.", 400);

  const db = await getDb();
  const userId = new ObjectId(session.user.id);
  const user = await db.collection("users").findOne<{ pendingMfaSecret?: string; pendingMfaExpiresAt?: Date }>({
    _id: userId,
    role: { $in: ["support_admin", "super_admin"] },
    mfaEnabled: { $ne: true },
    pendingMfaExpiresAt: { $gt: new Date() },
  });
  const isValid = user?.pendingMfaSecret
    ? (await verify({ secret: decryptMfaSecret(user.pendingMfaSecret), token, epochTolerance: 1 })).valid
    : false;
  if (!user?.pendingMfaSecret || !isValid) {
    return apiError("That code did not match or the setup expired. Start setup again.", 400);
  }

  const recoveryCodes = createRecoveryCodes();
  const update = await db.collection("users").updateOne(
    { _id: userId, mfaEnabled: { $ne: true }, pendingMfaSecret: user.pendingMfaSecret },
    {
      $set: {
        mfaSecret: user.pendingMfaSecret,
        mfaEnabled: true,
        recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
        updatedAt: new Date(),
      },
      $inc: { authVersion: 1 },
      $unset: { pendingMfaSecret: "", pendingMfaExpiresAt: "" },
    },
  );
  if (!update.modifiedCount) return apiError("MFA setup changed before it could be saved. Please try again.", 409);
  await db.collection("auditEvents").insertOne({
    actorId: userId,
    action: "admin_mfa_enabled",
    createdAt: new Date(),
  });
  return NextResponse.json({ enabled: true, recoveryCodes });
}
