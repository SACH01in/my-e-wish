import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { hasSupportGrant, verifyExperienceCode, type StoredExperience } from "@/lib/experiences";
import { hasPageAccess, setPageAccessCookie } from "@/lib/page-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRegisteredVisitor } from "@/lib/visitor-tracking";

/** Verifies a recipient's page code and grants a short-lived scoped session. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const { slug } = await params;
  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || !("code" in body) || typeof body.code !== "string" || body.code.length > 100) {
    return apiError("Enter the page code.", 400);
  }
  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({ slug, status: "published", isPrivate: true });
  if (!experience) return apiError("This page is unavailable or the code was incorrect.", 404);

  if (!(await checkRateLimit("unlock-page", experience._id.toHexString(), 100, 60 * 60 * 1000))) {
    return apiError("This page has had too many unlock attempts. Try again later.", 429);
  }
  const allowed = await checkRateLimit("unlock", `${experience._id.toHexString()}:${getClientAddress(request)}`, 8, 15 * 60 * 1000);
  if (!allowed) return apiError("Too many attempts. Please wait a while and try again.", 429);
  if (!(await verifyExperienceCode(experience, body.code))) {
    return apiError("This page is unavailable or the code was incorrect.", 401);
  }

  const response = NextResponse.json({ unlocked: true });
  setPageAccessCookie(response, experience._id.toHexString(), experience.accessCodeHash || "");
  return response;
}

/** Checks a quiz response server-side so its correct answer is never public. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const { slug } = await params;
  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || !("id" in body) || !("answer" in body)
    || typeof body.id !== "string" || typeof body.answer !== "string" || body.answer.length > 160) {
    return apiError("That answer could not be checked.", 400);
  }

  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({ slug, status: "published" });
  if (!experience) return apiError("Page not found.", 404);
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === experience.ownerId.toHexString();
  const supportAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
  const supportGranted = supportAdmin && await hasSupportGrant(experience._id.toHexString(), session?.user?.id || "");
  if (experience.isPrivate && !isOwner && !supportGranted && !(await hasPageAccess(experience._id.toHexString(), experience.accessCodeHash))) {
    return apiError("Unlock this page before playing.", 403);
  }
  if (!isOwner && !supportGranted && !(await getRegisteredVisitor(experience._id.toHexString()))) {
    return apiError("Share your name before opening this surprise.", 403);
  }
  if (!(await checkRateLimit("quiz-page", experience._id.toHexString(), 300, 60 * 60 * 1000))) {
    return apiError("This page has had too many guesses. Try again later.", 429);
  }
  if (!(await checkRateLimit("quiz", `${experience._id.toHexString()}:${getClientAddress(request)}`, 30, 60 * 1000))) {
    return apiError("Too many guesses. Take a little break and try again.", 429);
  }
  const question = experience.surprises.find((block) => block.id === body.id && block.kind === "question");
  if (!question?.answer) return apiError("That question is no longer available.", 404);
  const correct = question.answer.trim().toLocaleLowerCase() === body.answer.trim().toLocaleLowerCase();
  return NextResponse.json({ correct, ...(correct ? { message: question.body } : { hint: question.hint || "" }) });
}
