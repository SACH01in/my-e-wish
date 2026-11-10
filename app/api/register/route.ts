import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getDb, ensureIndexes } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { registrationSchema } from "@/lib/experience-schema";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/** Creates an unprivileged account and sends a one-time email verification link. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!isEmailConfigured() || !baseUrl) {
    return apiError("Email verification is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, and NEXTAUTH_URL.", 503);
  }

  const ipAllowed = await checkRateLimit("register-ip", getClientAddress(request), 5, 60 * 60 * 1000);
  if (!ipAllowed) return apiError("Too many sign-up attempts. Try again later.", 429);

  const parsedBody = await readJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your name, email, and password. Passwords must be at least 12 characters." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("register-email", email, 3, 60 * 60 * 1000))) {
    return apiError("Too many sign-up attempts for this address. Try again later.", 429);
  }

  const db = await getDb();
  await ensureIndexes(db);
  const existing = await db.collection("users").findOne({ email });
  if (existing) return apiError("An account with that email already exists. Try signing in instead.", 409);

  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const verificationId = createHash("sha256").update(token).digest("hex");
  const userResult = await db.collection("users").insertOne({
    name: parsed.data.name,
    email,
    passwordHash: await hash(parsed.data.password, 12),
    role: getRegistrationRole(email),
    authVersion: 0,
    emailVerified: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("verificationTokens").insertOne({
    userId: userResult.insertedId,
    tokenHash: verificationId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: now,
  });

  const verificationUrl = new URL("/verify", baseUrl);
  verificationUrl.searchParams.set("token", token);
  try {
    await sendEmail({
      to: email,
      subject: "Verify your Momenique account",
      content: {
        preheader: "One quick step to finish creating your Momenique account.",
        title: "Let’s make it official",
        greeting: `Hi ${parsed.data.name},`,
        paragraphs: ["Please verify your email address to finish setting up your account."],
        action: { label: "Verify my email", url: verificationUrl.toString() },
        finePrint: "This link expires in one hour. If you didn’t create this account, you can ignore this email.",
      },
    });
  } catch (error) {
    await db.collection("verificationTokens").deleteOne({ tokenHash: verificationId });
    await db.collection("users").deleteOne({ _id: userResult.insertedId, emailVerified: null });
    console.error("Email verification delivery failed:", error instanceof Error ? error.message : "Unknown SMTP error.");
    return apiError("We couldn't send the verification email. Please try again.", 502);
  }

  return NextResponse.json({ message: "Check your inbox for a verification link. It expires in one hour." }, { status: 201 });
}

/** Allows operators to bootstrap multiple admin accounts without a public role-changing endpoint. */
function getRegistrationRole(email: string): "customer" | "support_admin" | "super_admin" {
  const normalizeList = (value: string | undefined) => new Set((value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (normalizeList(process.env.SUPER_ADMIN_EMAILS).has(email)) return "super_admin";
  if (normalizeList(process.env.SUPPORT_ADMIN_EMAILS).has(email)) return "support_admin";
  return "customer";
}
