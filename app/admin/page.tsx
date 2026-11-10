import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { StoredExperience } from "@/lib/experiences";
import AdminConsole from "@/app/components/AdminConsole";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** Displays minimal page metadata only to explicitly provisioned support admins. */
export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!["support_admin", "super_admin"].includes(session.user.role)) notFound();
  if (!session.user.mfaEnabled) redirect("/admin/setup-mfa");

  const db = await getDb();
  const rows = await db.collection<StoredExperience>("experiences")
    .find({ status: "published" }, { projection: { slug: 1, headline: 1, recipient: 1, ownerId: 1, isPrivate: 1, occasion: 1, mood: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  const owners = await db.collection("users").find(
    { _id: { $in: [...new Map(rows.map((experience) => [experience.ownerId.toHexString(), experience.ownerId])).values()] } },
    { projection: { name: 1, email: 1 } },
  ).toArray();
  const ownerMap = new Map(owners.map((owner) => [owner._id.toHexString(), { name: owner.name, email: owner.email }]));
  const experiences = rows.map((row) => ({
    id: row._id.toHexString(),
    slug: row.slug,
    headline: row.headline,
    recipient: row.recipient,
    isPrivate: row.isPrivate,
    occasion: row.occasion,
    mood: row.mood,
    owner: ownerMap.get(row.ownerId.toHexString())?.name || "Account",
  }));
  const logs = await db.collection("auditEvents").find(
    { actorId: new ObjectId(session.user.id) },
    { projection: { action: 1, targetId: 1, reason: 1, createdAt: 1, expiresAt: 1 } },
  ).sort({ createdAt: -1 }).limit(20).toArray();

  return <AdminConsole adminName={session.user.name || "Admin"} experiences={experiences} audit={logs.map((entry) => ({ action: String(entry.action), reason: String(entry.reason || ""), createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : "" }))} />;
}
