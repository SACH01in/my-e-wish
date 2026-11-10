import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, ensureIndexes } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { isEmailConfigured, sendEmail } from "@/lib/email";

const genericMessage = "If a verified account matches that email, a password reset link will arrive shortly.";

/** Sends a non-enumerating, one-time password reset email to verified accounts. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!isEmailConfigured() || !baseUrl) return apiError("Password reset email is not configured.", 503);
  if (!(await checkRateLimit("password-reset-ip", getClientAddress(request), 5, 60 * 60 * 1000))) {
    return apiError("Too many requests. Try again later.", 429);
  }

  const parsedBody = await readJsonBody(request, 2 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const email = body && typeof body === "object" && "email" in body && typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: genericMessage });
  }
  if (!(await checkRateLimit("password-reset-email", email, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ message: genericMessage });
  }

  const db = await getDb();
  await ensureIndexes(db);
  const user = await db.collection("users").findOne<{ _id: import("mongodb").ObjectId; name: string }>({ email, status: "active", emailVerified: { $ne: null } });
  if (!user) return NextResponse.json({ message: genericMessage });

  await db.collection("passwordResetTokens").deleteMany({ userId: user._id });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.collection("passwordResetTokens").insertOne({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  });

  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);
  try {
    await sendEmail({
      to: email,
      subject: "Reset your Momenique password",
      content: {
        preheader: "Use this one-time link to choose a new password.",
        title: "A fresh start for your account",
        greeting: `Hi ${user.name},`,
        paragraphs: ["We received a request to reset the password for your Momenique account."],
        action: { label: "Choose a new password", url: resetUrl.toString() },
        finePrint: "This one-time link expires in 30 minutes. If you didn’t request a reset, you can ignore this email.",
      },
    });
  } catch (error) {
    await db.collection("passwordResetTokens").deleteOne({ tokenHash });
    console.error("Password reset email delivery failed:", error instanceof Error ? error.message : "Unknown SMTP error.");
    return NextResponse.json({ message: genericMessage });
  }

  return NextResponse.json({ message: genericMessage });
}
