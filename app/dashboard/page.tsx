import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicExperience, type StoredExperience } from "@/lib/experiences";
import Dashboard from "@/app/components/Dashboard";
import ProfileAvatarLink from "@/app/components/ProfileAvatarLink";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** Loads the signed-in creator's pages directly from MongoDB. */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const isAdmin = session.user.role === "support_admin" || session.user.role === "super_admin";

  const db = await getDb();
  const ownerId = new ObjectId(session.user.id);
  const documents = await db.collection<StoredExperience>("experiences")
    .find({ ownerId })
    .sort({ updatedAt: -1 })
    .toArray();
  const experiences = documents.map((item) => toPublicExperience(item, true));
  const reviewCounts = documents.length
    ? await db.collection("experienceReviews").aggregate<{ _id: ObjectId; count: number }>([
      { $match: { experienceId: { $in: documents.map((item) => item._id) } } },
      { $group: { _id: "$experienceId", count: { $sum: 1 } } },
    ]).toArray()
    : [];
  const reviewsByExperience = Object.fromEntries(reviewCounts.map((item) => [item._id.toHexString(), item.count]));

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <div><span className="dashboard-greeting">Hello, {session.user.name || "there"}</span>{isAdmin && <Link className="dashboard-admin-link" href="/admin">Admin console ↗</Link>}<ProfileAvatarLink name={session.user.name || session.user.email || ""} role={session.user.role} /><Link className="button button-dark button-small mobile-hide-header-cta" href="/create">Make a wish ↗</Link></div>
      </header>
      <Dashboard experiences={experiences} reviewCounts={reviewsByExperience} />
    </main>
  );
}
