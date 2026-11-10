import Link from "next/link";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { StoredExperience } from "@/lib/experiences";
import type { ExperienceVisitor } from "@/lib/visitor-tracking";
import ProfileAvatarLink from "@/app/components/ProfileAvatarLink";
import SignOutButton from "@/app/components/SignOutButton";

type ProfileReview = {
  experienceId: ObjectId;
  visitorHash: string;
  message: string;
  createdAt: Date;
};

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your visitor profile",
  robots: { index: false, follow: false },
};

/** Shows the signed-in creator only their own pages and self-reported visitor list. */
export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");
  const isAdmin = session.user.role === "support_admin" || session.user.role === "super_admin";

  const ownerId = new ObjectId(session.user.id);
  const db = await getDb();
  const pages = await db.collection<StoredExperience>("experiences")
    .find({ ownerId }, { projection: { slug: 1, occasion: 1, customOccasion: 1, recipient: 1, headline: 1, status: 1 } })
    .sort({ updatedAt: -1 })
    .toArray();
  const pageIds = pages.map((page) => page._id);
  const visitorCollection = db.collection<ExperienceVisitor>("experienceVisitors");
  const reviewCollection = db.collection<ProfileReview>("experienceReviews");
  const [totalVisitors, visitorCounts, recentVisitors, totalReviews, reviewCounts] = pageIds.length
    ? await Promise.all([
      visitorCollection.countDocuments({ experienceId: { $in: pageIds } }),
      visitorCollection.aggregate<{ _id: ObjectId; count: number }>([
        { $match: { experienceId: { $in: pageIds } } },
        { $group: { _id: "$experienceId", count: { $sum: 1 } } },
      ]).toArray(),
      visitorCollection.find({ experienceId: { $in: pageIds } })
        .project({ experienceId: 1, visitorName: 1, visitedAt: 1 })
        .sort({ visitedAt: -1 })
        .limit(200)
        .toArray(),
      reviewCollection.countDocuments({ experienceId: { $in: pageIds } }),
      reviewCollection.aggregate<{ _id: ObjectId; count: number }>([
        { $match: { experienceId: { $in: pageIds } } },
        { $group: { _id: "$experienceId", count: { $sum: 1 } } },
      ]).toArray(),
    ])
    : [0, [], [], 0, []];
  const countByPage = new Map(visitorCounts.map((item) => [item._id.toHexString(), item.count]));
  const reviewsByPage = new Map(reviewCounts.map((item) => [item._id.toHexString(), item.count]));
  const pageById = new Map(pages.map((page) => [page._id.toHexString(), page]));
  const visitorHashes = [...new Set(recentVisitors.map((visitor) => visitor.visitorHash))];
  const recentReviews = pageIds.length && visitorHashes.length
    ? await reviewCollection.find({
      experienceId: { $in: pageIds },
      visitorHash: { $in: visitorHashes },
    }).toArray()
    : [];
  const reviewByVisitor = new Map(recentReviews.map((review) => [
    `${review.experienceId.toHexString()}:${review.visitorHash}`,
    review,
  ]));

  return (
    <main className="profile-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <div className="profile-nav">{isAdmin && <Link className="dashboard-admin-link" href="/admin">Admin console ↗</Link>}<Link href="/dashboard">My pages</Link><ProfileAvatarLink name={session.user.name || session.user.email || ""} role={session.user.role} /><Link className="button button-dark button-small mobile-hide-header-cta" href="/create">Make a wish ↗</Link></div>
      </header>
      <section className="profile-content">
        <div className="profile-heading">
          <div className="profile-heading-copy">
            <span className="profile-kicker"><span aria-hidden="true">✦</span> CREATOR STUDIO <span className="profile-kicker-dot" /> YOUR LITTLE CORNER</span>
            <h1>Your stories are <em>out there.</em></h1>
            <p>Every visit is a little hello. Every note is a feeling your words left behind.</p>
          </div>
          <div className="profile-hero-art" aria-hidden="true">
            <span className="profile-orbit profile-orbit-one" />
            <span className="profile-orbit profile-orbit-two" />
            <span className="profile-art-spark profile-art-spark-one">✦</span>
            <span className="profile-art-spark profile-art-spark-two">✳</span>
            <div className="profile-art-card"><span>♡</span><small>A NOTE, JUST FOR YOU</small><i>Moments<br />made to keep.</i></div>
            <span className="profile-art-stamp">✿</span>
          </div>
        </div>
        <div className="profile-stats">
          <article className="profile-stat-pages"><span className="profile-stat-icon" aria-hidden="true"><StatIcon kind="pages" /></span><span>YOUR PAGES</span><strong>{pages.length}</strong><small>Drafts and published pages</small></article>
          <article className="profile-stat-visitors"><span className="profile-stat-icon" aria-hidden="true"><StatIcon kind="visitors" /></span><span>VISITOR HELLOS</span><strong>{totalVisitors}</strong><small>Unique page-browser registrations</small></article>
          <article className="profile-stat-notes"><span className="profile-stat-icon" aria-hidden="true"><StatIcon kind="notes" /></span><span>LOVELY NOTES</span><strong>{totalReviews}</strong><small>Comments shared on your wishes</small></article>
        </div>
        <section className="visitor-list">
          <div className="visitor-list-heading"><div><span className="profile-section-kicker"><span aria-hidden="true">✿</span> THE GUESTBOOK</span><h2>Visitors & notes</h2><p>The kind words and kind people behind each page.</p></div><Link href="/dashboard"><span aria-hidden="true">←</span> Back to my pages</Link></div>
          {recentVisitors.length || totalReviews ? (
            <div className="visitor-page-groups">
              {pages.map((page) => {
                const pageId = page._id.toHexString();
                const pageVisitors = recentVisitors.filter((visitor) => visitor.experienceId.toHexString() === pageId);
                const pageReviews = reviewsByPage.get(pageId) || 0;
                if (!pageVisitors.length && !pageReviews) return null;
                return (
                  <section className="visitor-page-group" id={`page-${pageId}`} key={pageId}>
                    <header>
                      <div><span className="profile-page-label"><span aria-hidden="true">✦</span> {page.customOccasion || page.occasion}</span><h3>{page.recipient || "Someone lovely"} · {page.headline}</h3></div>
                      <span className="profile-page-counts"><b>{countByPage.get(pageId) || 0}</b> visits <i>·</i> <b>{pageReviews}</b> notes</span>
                    </header>
                    {pageVisitors.length ? (
                      <div className="visitor-rows">
                        {pageVisitors.map((visitor) => {
                          const review = reviewByVisitor.get(`${pageId}:${visitor.visitorHash}`);
                          return (
                            <article className="visitor-row" key={visitor._id.toHexString()}>
                              <span className="visitor-avatar" aria-hidden="true">{visitor.visitorName.trim().charAt(0).toUpperCase() || "♡"}</span>
                              <div className="visitor-row-copy">
                                <strong>{visitor.visitorName}</strong>
                                <span>Visited · {visitor.visitedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                                {review && <blockquote className="visitor-review-message">{review.message}</blockquote>}
                              </div>
                              {review &&                               <time dateTime={review.createdAt.toISOString()}>Note · {formatCommentDate(review.createdAt)}</time>}
                            </article>
                          );
                        })}
                      </div>
                    ) : <p className="visitor-page-empty">No visitor details yet. Shared notes are listed here.</p>}
                    {pageVisitors.length < (countByPage.get(pageId) || 0) && <p className="visitor-page-empty">Some earlier visitor entries are outside the recent list.</p>}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="visitor-empty"><span className="visitor-empty-icon">✿</span><h3>Your guestbook is waiting for its first hello.</h3><p>When someone visits a published wish, their name and any note they leave will be gathered here.</p><Link href="/dashboard">Take a look at your pages ↗</Link></div>
          )}
          {totalVisitors > recentVisitors.length && <p className="profile-cap-note">Showing up to 200 recent visitor entries; note totals include all pages.</p>}
        </section>
        <p className="visitor-privacy-note"><strong>A note about names:</strong> visitors enter their names and comments themselves. Names are not verified identities, and each count represents a browser registration for one page—not a guaranteed unique person. We do not show or store visitor IP addresses here.</p>
      <div className="dashboard-bottom"><span>Trust | Wishes | Love</span><SignOutButton /></div>
      </section>
    </main>
  );
}

function formatCommentDate(date: Date): string {
  const ageMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (ageMs < minute) return "Moments ago";
  if (ageMs < hour) {
    const minutes = Math.floor(ageMs / minute);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (ageMs < day) {
    const hours = Math.floor(ageMs / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatIcon({ kind }: { kind: "pages" | "visitors" | "notes" }) {
  if (kind === "pages") {
    return <svg viewBox="0 0 24 24"><path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" /><path d="M14 3.75v4h4M8.5 12h7M8.5 15.5h7" /></svg>;
  }
  if (kind === "visitors") {
    return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.25" /><path d="M3.75 19a5.25 5.25 0 0 1 10.5 0M16 5.25a3 3 0 0 1 0 5.75M17 14a4.25 4.25 0 0 1 3.25 4.1" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><path d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v8.5A2.75 2.75 0 0 1 17.25 17H10l-5 3v-4.1a2.7 2.7 0 0 1-1-2.15Z" /><path d="M8 8h8M8 11.5h5" /></svg>;
}
