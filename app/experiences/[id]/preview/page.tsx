import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import PublicExperience from "@/app/components/PublicExperience";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicExperience, type StoredExperience } from "@/lib/experiences";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private page preview",
  robots: { index: false, follow: false },
};

export default async function ExperiencePreviewPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [totalViews, totalComments, comments] = experience.status === "published"
    ? await Promise.all([
      db.collection("experienceVisitors").countDocuments({ experienceId: experience._id }),
      db.collection("experienceReviews").countDocuments({ experienceId: experience._id }),
      db.collection<{ visitorName: string; message: string; createdAt: Date }>("experienceReviews")
        .find({ experienceId: experience._id })
        .project({ visitorName: 1, message: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .toArray(),
    ])
    : [0, 0, []];

  const safeExperience = toPublicExperience(experience);
  return (
    <PublicExperience
      slug={experience.slug}
      recipient={experience.recipient}
      initialExperience={safeExperience}
      previewStatus={experience.status}
      ownerFeedback={{
        totalViews,
        totalComments,
        comments: comments.map((comment) => ({
          visitorName: comment.visitorName,
          message: comment.message,
          createdAt: comment.createdAt.toISOString(),
        })),
      }}
    />
  );
}
