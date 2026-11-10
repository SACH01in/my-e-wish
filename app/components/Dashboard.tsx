"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Experience = {
  id: string;
  slug: string;
  occasion: string;
  customOccasion: string;
  mood: string;
  template: string;
  headline: string;
  recipient: string;
  image: string;
  color: string;
  status: "draft" | "published";
  isPrivate: boolean;
};

/** Presents MongoDB-backed pages and exposes only the current owner's actions. */
export default function Dashboard({
  experiences,
  reviewCounts,
}: {
  experiences: Experience[];
  reviewCounts: Record<string, number>;
}) {
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState("");

  async function deleteExperience(id: string) {
    if (!window.confirm("Delete this page? This cannot be undone.")) return;
    setRemoving(id);
    try {
      const response = await fetch(`/api/experiences/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "The page could not be deleted.");
      }
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The page could not be deleted.");
      setRemoving("");
    }
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
      setNotice("Share link copied. Send the page code separately if it is private.");
    } catch {
      setNotice("Clipboard access was unavailable. Open the published page and copy its address.");
    }
  }

  return (
    <section className="dashboard-content">
      <div className="dashboard-heading">
        <div><span className="eyebrow">YOUR LITTLE CORNER</span><h1>Your <em>moments.</em></h1><p>Your pages are saved to your account, ready whenever you need them.</p></div>
        <Link className="button button-dark" href="/create">Create a new page <span>↗</span></Link>
      </div>
      {notice && <p className="dashboard-notice" role="status">{notice}</p>}
      {experiences.length ? (
        <div className="dashboard-grid">
          {experiences.map((experience) => (
            <article className="dashboard-card" key={experience.id}>
              <Link href={`/experiences/${experience.id}/preview`} className={`dashboard-card-art dashboard-mood-${experience.mood.toLowerCase()} dashboard-template-${experience.template}`} style={{ "--tile-color": experience.color } as React.CSSProperties} aria-label={`Preview ${experience.recipient || "your"} ${experience.customOccasion || experience.occasion} wish`}>
                {experience.image ? <img src={experience.image} alt="" /> : <span>{moodMark[experience.mood] || "✧"}</span>}
                <small>{experience.customOccasion || experience.occasion} · {experience.mood}</small>
                <b>{experience.isPrivate ? "Private" : experience.status}</b>
              </Link>
              <div className="dashboard-card-copy">
                <strong>{experience.recipient || "Someone lovely"}</strong>
                <span>{experience.headline}</span>
                {experience.status === "published" && <Link className="dashboard-review-count" href={`/profile#page-${experience.id}`}>
                  {reviewCounts[experience.id] || 0} review{reviewCounts[experience.id] === 1 ? "" : "s"} · See visitors & notes ↗
                </Link>}
              </div>
              <div className="dashboard-card-actions">
                <Link className="dashboard-preview-link" href={`/experiences/${experience.id}/preview`}>Preview ↗</Link>
                <Link href={`/experiences/${experience.id}/edit`}>Edit page ↗</Link>
                {experience.status === "published" && <button onClick={() => copyLink(experience.slug)}>Copy share link</button>}
                <button className="dashboard-delete" disabled={removing === experience.id} onClick={() => deleteExperience(experience.id)}>{removing === experience.id ? "Deleting…" : "Delete"}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-empty"><span>✿</span><h2>Your first lovely moment starts here.</h2><p>Create a page and it will be waiting here in your account.</p><Link className="button button-dark" href="/create">Make your first wish ↗</Link></div>
      )}
      <div className="dashboard-bottom"><span>Only you can edit your unpublished pages.</span><button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button></div>
    </section>
  );
}

const moodMark: Record<string, string> = {
  Heartfelt: "♡",
  Playful: "✳",
  Elegant: "❧",
  Dreamy: "☾",
  Encouraging: "☼",
};
