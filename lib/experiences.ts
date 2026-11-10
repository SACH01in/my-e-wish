import { randomBytes } from "node:crypto";
import { ObjectId, type WithId } from "mongodb";
import { compare, hash } from "bcryptjs";
import { getDb } from "@/lib/db";
import { hasPageAccess } from "@/lib/page-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Mood, Occasion, SurpriseBlock, TemplateId } from "@/lib/types";
import { getRegisteredVisitor } from "@/lib/visitor-tracking";

export type StoredExperience = {
  ownerId: ObjectId;
  slug: string;
  occasion: Occasion;
  customOccasion: string;
  mood: Mood;
  template: TemplateId;
  recipient: string;
  from: string;
  headline: string;
  message: string;
  surprises: SurpriseBlock[];
  accessCodeHash?: string | null;
  isPrivate: boolean;
  image: string;
  color: string;
  status: "draft" | "published";
  createdAt: Date;
  updatedAt: Date;
};

/** Generates an unguessable public slug without exposing a database ID. */
export function createShareSlug(): string {
  return randomBytes(15).toString("base64url");
}

/** Removes owner and credential fields before experience data reaches a recipient. */
export function toPublicExperience(experience: WithId<StoredExperience>, revealAnswers = false) {
  return {
    id: experience._id.toHexString(),
    slug: experience.slug,
    occasion: experience.occasion,
    customOccasion: experience.customOccasion,
    mood: experience.mood,
    template: experience.template,
    recipient: experience.recipient,
    from: experience.from,
    headline: experience.headline,
    message: experience.message,
    surprises: experience.surprises.map((block) => {
      if (revealAnswers) return block;
      const { answer: _answer, ...safeBlock } = block;
      return safeBlock;
    }),
    isPrivate: experience.isPrivate,
    image: experience.image,
    color: experience.color,
    status: experience.status,
  };
}

/** Looks up a published experience and enforces the page-specific recipient code. */
export async function getRecipientExperience(slug: string) {
  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({
    slug,
    status: "published",
  });
  if (!experience) return null;

  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id;
  const isOwner = viewerId === experience.ownerId.toHexString();
  const isSupportAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
  const supportGrant = isSupportAdmin && await hasSupportGrant(experience._id.toHexString(), viewerId || "");
  const unlocked = !experience.isPrivate || isOwner || supportGrant
    || await hasPageAccess(experience._id.toHexString(), experience.accessCodeHash);

  if (supportGrant) {
    await db.collection("auditEvents").insertOne({
      actorId: new ObjectId(viewerId),
      action: "support_private_page_view",
      targetId: experience._id,
      createdAt: new Date(),
    });
  }
  const needsVisitorName = unlocked && !isOwner && !supportGrant
    && !(await getRegisteredVisitor(experience._id.toHexString()));
  return {
    locked: !unlocked,
    needsVisitorName,
    experience: unlocked && !needsVisitorName ? toPublicExperience(experience) : null,
    pageId: experience._id.toHexString(),
    isPrivate: experience.isPrivate,
    recipient: experience.recipient,
  };
}

/** Checks a support grant's scope, actor, revocation, and expiry. */
export async function hasSupportGrant(experienceId: string, adminId: string): Promise<boolean> {
  if (!ObjectId.isValid(experienceId) || !ObjectId.isValid(adminId)) return false;
  const db = await getDb();
  const grant = await db.collection("supportAccessGrants").findOne({
    experienceId: new ObjectId(experienceId),
    adminId: new ObjectId(adminId),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  return Boolean(grant);
}

/** Checks a creator-provided code against its salted password hash. */
export async function verifyExperienceCode(
  experience: WithId<StoredExperience>,
  providedCode: string,
): Promise<boolean> {
  if (!experience.accessCodeHash || providedCode.length > 100) return false;
  return compare(providedCode, experience.accessCodeHash);
}

/** Hashes page codes before persistence; callers never store the raw code. */
export async function hashExperienceCode(code: string): Promise<string> {
  return hash(code, 12);
}
