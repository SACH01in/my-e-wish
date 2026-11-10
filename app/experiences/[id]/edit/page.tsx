import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicExperience, type StoredExperience } from "@/lib/experiences";
import ExperienceEditor from "@/app/components/ExperienceEditor";

export const metadata = { robots: { index: false, follow: false } };

/** Loads editable content only after verifying the authenticated owner. */
export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({
    _id: new ObjectId(id),
    ownerId: new ObjectId(session.user.id),
  });
  if (!experience) notFound();

  return <ExperienceEditor initial={{ ...toPublicExperience(experience, true), status: experience.status }} />;
}
