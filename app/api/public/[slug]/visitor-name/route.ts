import { MongoServerError, ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { hasSupportGrant, toPublicExperience, type StoredExperience } from "@/lib/experiences";
import { hasPageAccess } from "@/lib/page-access";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createVisitorToken,
  getRegisteredVisitor,
  hashVisitorToken,
  visitorCookieName,
  type ExperienceVisitor,
} from "@/lib/visitor-tracking";

/** Records a self-reported visitor name before releasing a published page. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || !("name" in body) || typeof body.name !== "string") {
    return apiError("Enter the name you would like the creator to see.", 400);
  }
  const visitorName = body.name.trim();
  if (!visitorName || visitorName.length > 80 || /[\u0000-\u001f\u007f]/.test(visitorName)) {
    return apiError("Enter a name between 1 and 80 characters.", 400);
  }

  const { slug } = await params;
  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({ slug, status: "published" });
  if (!experience) return apiError("This page could not be found.", 404);

  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id || "";
  const isOwner = viewerId === experience.ownerId.toHexString();
  const isSupportAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
  const supportGrant = isSupportAdmin && await hasSupportGrant(experience._id.toHexString(), viewerId);
  if (experience.isPrivate && !isOwner && !supportGrant
    && !(await hasPageAccess(experience._id.toHexString(), experience.accessCodeHash))) {
    return apiError("Enter the page code before sharing your name.", 403);
  }

  if (isOwner || supportGrant) {
    return NextResponse.json({ experience: toPublicExperience(experience), registeredName: null });
  }

  const experienceId = experience._id.toHexString();
  const allowed = await checkRateLimit("visitor-name-page", experienceId, 1200, 60 * 60 * 1000);
  if (!allowed) return apiError("This page has had too many visitor registrations. Try again later.", 429);
  const addressAllowed = await checkRateLimit(
    "visitor-name-address",
    `${experienceId}:${getClientAddress(request)}`,
    12,
    15 * 60 * 1000,
  );
  if (!addressAllowed) return apiError("Too many attempts. Please wait a while and try again.", 429);

  const cookieName = visitorCookieName(experienceId);
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(cookieName)?.value;
  const token = cookieToken && /^[A-Za-z0-9_-]{43}$/.test(cookieToken) ? cookieToken : createVisitorToken();
  const visitorHash = hashVisitorToken(token);
  const visitors = db.collection<ExperienceVisitor>("experienceVisitors");
  const existing = await visitors.findOne({ experienceId: experience._id, visitorHash });
  let registeredName = existing?.visitorName || visitorName;
  if (!existing) {
    try {
      await visitors.updateOne(
        { experienceId: experience._id, visitorHash },
        { $setOnInsert: { experienceId: experience._id, visitorHash, visitorName, visitedAt: new Date() } },
        { upsert: true },
      );
      const saved = await visitors.findOne({ experienceId: experience._id, visitorHash });
      if (!saved) throw new Error("Visitor registration was not saved.");
      registeredName = saved.visitorName;
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      const saved = await visitors.findOne({ experienceId: experience._id, visitorHash });
      if (!saved) throw error;
      registeredName = saved.visitorName;
    }
  }

  const response = NextResponse.json({
    experience: toPublicExperience(experience),
    registeredName,
  }, { headers: { "Cache-Control": "private, no-store" } });
  if (token !== cookieToken) {
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
