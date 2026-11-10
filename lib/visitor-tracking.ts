import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export type ExperienceVisitor = {
  experienceId: ObjectId;
  visitorHash: string;
  visitorName: string;
  visitedAt: Date;
};

export function visitorCookieName(experienceId: string): string {
  return `ew_visitor_${experienceId}`;
}

export function createVisitorToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the stored self-reported name only when this browser has registered for this page. */
export async function getRegisteredVisitor(experienceId: string): Promise<ExperienceVisitor | null> {
  if (!ObjectId.isValid(experienceId)) return null;
  const token = (await cookies()).get(visitorCookieName(experienceId))?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const db = await getDb();
  return db.collection<ExperienceVisitor>("experienceVisitors").findOne({
    experienceId: new ObjectId(experienceId),
    visitorHash: hashVisitorToken(token),
  });
}
