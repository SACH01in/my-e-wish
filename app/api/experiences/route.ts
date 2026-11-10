import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb, ensureIndexes } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkAccountRateLimit } from "@/lib/rate-limit";
import { experienceSchema } from "@/lib/experience-schema";
import { createShareSlug, hashExperienceCode, toPublicExperience, type StoredExperience } from "@/lib/experiences";
import { mediaReferenceToPublicId } from "@/lib/media-reference";

/** Lists only the current customer's pages, including quiz answers for editing. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in.", 401);
  const db = await getDb();
  const documents = await db.collection<StoredExperience>("experiences")
    .find({ ownerId: new ObjectId(session.user.id) })
    .sort({ updatedAt: -1 })
    .toArray();
  return NextResponse.json({ experiences: documents.map((item) => toPublicExperience(item, true)) });
}

/** Validates and stores a customer's new experience on the server. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in.", 401);
  if (!(await checkAccountRateLimit("experience-create", session.user.id, getClientAddress(request), 30, 60 * 60 * 1000))) {
    return apiError("Too many pages created. Try again later.", 429);
  }
  const parsedBody = await readJsonBody(request, 64 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your page details." }, { status: 400 });
  if (parsed.data.isPrivate && parsed.data.status === "published" && (!parsed.data.accessCode || parsed.data.accessCode.length < 8)) {
    return apiError("Private page codes must be at least 8 characters.", 400);
  }

  const db = await getDb();
  await ensureIndexes(db);
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
  const now = new Date();
  const document: StoredExperience = {
    ownerId: new ObjectId(session.user.id),
    slug: createShareSlug(),
    ...content,
    ...(content.isPrivate && accessCode ? { accessCodeHash: await hashExperienceCode(accessCode) } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<StoredExperience>("experiences").insertOne(document);
  const saved = await db.collection<StoredExperience>("experiences").findOne({ _id: result.insertedId });
  if (!saved) return apiError("The page was created but could not be loaded. Please refresh your dashboard.", 500);
  return NextResponse.json({ experience: toPublicExperience(saved, true) }, { status: 201 });
}
