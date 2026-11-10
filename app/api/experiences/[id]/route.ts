import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkAccountRateLimit } from "@/lib/rate-limit";
import { experienceSchema } from "@/lib/experience-schema";
import { hashExperienceCode, toPublicExperience, type StoredExperience } from "@/lib/experiences";
import { mediaReferenceToPublicId } from "@/lib/media-reference";

type RouteContext = { params: Promise<{ id: string }> };

/** Loads one page only when the signed-in customer owns it. */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in.", 401);
  if (!ObjectId.isValid(id)) return apiError("Page not found.", 404);
  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({
    _id: new ObjectId(id),
    ownerId: new ObjectId(session.user.id),
  });
  if (!experience) return apiError("Page not found.", 404);
  return NextResponse.json({ experience: toPublicExperience(experience, true) });
}

/** Updates only fields belonging to the owner; an omitted code retains its hash. */
export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in.", 401);
  if (!(await checkAccountRateLimit("experience-update", session.user.id, getClientAddress(request), 60, 60 * 60 * 1000))) {
    return apiError("Too many page updates. Try again later.", 429);
  }
  if (!ObjectId.isValid(id)) return apiError("Page not found.", 404);
  const parsedBody = await readJsonBody(request, 64 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your page details." }, { status: 400 });

  const db = await getDb();
  const collection = db.collection<StoredExperience>("experiences");
  const filter = { _id: new ObjectId(id), ownerId: new ObjectId(session.user.id) };
  const existing = await collection.findOne(filter);
  if (!existing) return apiError("Page not found.", 404);
  if (parsed.data.isPrivate && parsed.data.status === "published" && !parsed.data.accessCode && !existing.accessCodeHash) {
    return apiError("Add a page code before publishing this private page.", 400);
  }
  if (parsed.data.isPrivate && parsed.data.accessCode && parsed.data.accessCode.length < 8) {
    return apiError("Private page codes must be at least 8 characters.", 400);
  }

  const { accessCode, ...content } = parsed.data;
  const mediaReferences = [...new Set([
    content.image,
    ...content.surprises.filter((block) => block.kind === "memory").map((block) => block.body),
  ].filter(Boolean))];
  if (mediaReferences.length) {
    const publicIds = mediaReferences.map(mediaReferenceToPublicId);
    if (publicIds.some((publicId) => !publicId)) return apiError("One of those images is not available in your account.", 400);
    const ownedMedia = await db.collection("mediaAssets").countDocuments({
      ownerId: new ObjectId(session.user.id),
      publicId: { $in: publicIds },
    });
    if (ownedMedia !== mediaReferences.length) return apiError("One of those images is not available in your account.", 400);
  }
  await collection.updateOne(filter, {
    $set: {
      ...content,
      ...(!content.isPrivate ? { accessCodeHash: null } : accessCode ? { accessCodeHash: await hashExperienceCode(accessCode) } : {}),
      updatedAt: new Date(),
    },
  });
  const saved = await collection.findOne(filter);
  if (!saved) return apiError("Your page could not be reloaded after saving.", 500);
  return NextResponse.json({ experience: toPublicExperience(saved, true) });
}

/** Deletes an owner's page; an unrelated user's ID can never be deleted. */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in.", 401);
  if (!(await checkAccountRateLimit("experience-delete", session.user.id, getClientAddress(request), 20, 60 * 60 * 1000))) {
    return apiError("Too many page deletion attempts. Try again later.", 429);
  }
  if (!ObjectId.isValid(id)) return apiError("Page not found.", 404);
  const db = await getDb();
  const result = await db.collection<StoredExperience>("experiences").deleteOne({
    _id: new ObjectId(id),
    ownerId: new ObjectId(session.user.id),
  });
  if (!result.deletedCount) return apiError("Page not found.", 404);
  const experienceId = new ObjectId(id);
  await Promise.all([
    db.collection("experienceVisitors").deleteMany({ experienceId }),
    db.collection("experienceReviews").deleteMany({ experienceId }),
  ]);
  return NextResponse.json({ deleted: true });
}
