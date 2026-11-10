import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import type { StoredExperience } from "@/lib/experiences";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { checkAccountRateLimit } from "@/lib/rate-limit";

/** Grants a named administrator 15 minutes of one-page support access and notifies the owner. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["support_admin", "super_admin"].includes(session.user.role)) {
    return apiError("Administrator access is required.", 403);
  }
  if (!session.user.mfaEnabled) return apiError("Enable multi-factor authentication before using support access.", 403);
  if (!(await checkAccountRateLimit("admin-support-grant", session.user.id, getClientAddress(request), 10, 60 * 60 * 1000))) {
    return apiError("Too many support access grants. Try again later.", 429);
  }
  const { id } = await params;
  if (!ObjectId.isValid(id)) return apiError("Page not found.", 404);
  const parsedBody = await readJsonBody(request, 2 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const reason = body && typeof body === "object" && "reason" in body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 10 || reason.length > 500) return apiError("Give a support reason between 10 and 500 characters.", 400);

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!isEmailConfigured() || !baseUrl) return apiError("Owner notifications are not configured. Support access is unavailable.", 503);

  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({
    _id: new ObjectId(id),
    status: "published",
  });
  if (!experience) return apiError("Page not found.", 404);
  const owner = await db.collection("users").findOne<{ email: string; name: string }>({ _id: experience.ownerId, status: "active" });
  if (!owner?.email) return apiError("The page owner could not be notified, so access was not granted.", 503);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const grant = await db.collection("supportAccessGrants").insertOne({
    experienceId: experience._id,
    adminId: new ObjectId(session.user.id),
    reason,
    createdAt: new Date(),
    expiresAt,
  });
  const pageUrl = new URL(`/${experience.slug}`, baseUrl).toString();
  try {
    await sendEmail({
      to: owner.email,
      subject: "A support administrator was granted temporary page access",
      content: {
        preheader: "An administrator accessed one of your Momenique pages for support.",
        title: "A support request update",
        greeting: `Hi ${owner.name},`,
        paragraphs: ["A support administrator has requested temporary access to one of your pages."],
        details: [
          { label: "Page", value: experience.headline },
          { label: "Reason", value: reason },
          { label: "Access duration", value: "15 minutes" },
        ],
        action: { label: "Open your page", url: pageUrl },
        finePrint: "If you didn’t expect this, please contact support. This access is time-limited and recorded.",
      },
    });
  } catch (error) {
    await db.collection("supportAccessGrants").deleteOne({ _id: grant.insertedId });
    console.error("Support-access notification failed:", error instanceof Error ? error.message : "Unknown SMTP error.");
    return apiError("The owner could not be notified, so support access was not granted.", 502);
  }

  await db.collection("auditEvents").insertOne({
    actorId: new ObjectId(session.user.id),
    action: "support_access_granted",
    targetId: experience._id,
    reason,
    createdAt: new Date(),
    expiresAt,
  });
  return NextResponse.json({ url: pageUrl, expiresAt });
}
