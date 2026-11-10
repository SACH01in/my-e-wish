"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import SurpriseBlocks from "@/app/components/SurpriseBlocks";
import MoodAtmosphere from "@/app/components/MoodAtmosphere";
import ExperienceTemplate, { type RecipientStory } from "@/app/components/ExperienceTemplates";
import VisitorReviewForm from "@/app/components/VisitorReviewForm";

type PublicPageData = RecipientStory & {
  id: string;
  slug: string;
  color: string;
};

type OwnerFeedback = {
  totalViews: number;
  totalComments: number;
  comments: Array<{ visitorName: string; message: string; createdAt: string }>;
};

/** Renders either a locked access screen or the full recipient story page. */
export default function PublicExperience({
  slug,
  recipient,
  initialExperience,
  needsVisitorName = false,
  previewStatus,
  ownerFeedback,
}: {
  slug: string;
  recipient: string;
  initialExperience: PublicPageData | null;
  needsVisitorName?: boolean;
  previewStatus?: "draft" | "published";
  ownerFeedback?: OwnerFeedback;
}) {
  const router = useRouter();
  const [experience, setExperience] = useState(initialExperience);
  const [needsName, setNeedsName] = useState(needsVisitorName);
  const [code, setCode] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That code could not be checked.");
      const pageResponse = await fetch(`/api/public/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const page = await pageResponse.json();
      if (!pageResponse.ok) throw new Error(page.error || "This page could not be opened.");
      setExperience(page.experience || null);
      setNeedsName(Boolean(page.needsVisitorName));
      setCode("");
      router.refresh();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "That code could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  async function registerVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}/visitor-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: visitorName }),
      });
      const result = await response.json();
      if (!response.ok || !result.experience) throw new Error(result.error || "Your name could not be saved.");
      setExperience(result.experience);
      setNeedsName(false);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Your name could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (needsName) {
    return (
      <main className="public-lock-page" style={{ "--wish-color": "#b86f69" } as React.CSSProperties}>
        <Link className="brand public-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <section className="public-lock-card visitor-name-card">
          <span className="unlock-icon">♡</span>
          <span className="eyebrow">ONE LITTLE THING BEFORE THE SURPRISE</span>
          <h1>{recipient ? `${recipient}, who’s visiting?` : "Who’s visiting?"}</h1>
          <p>Leave the name you’d like the creator to see, and then the page is yours to open.</p>
          <form onSubmit={registerVisitor}>
            <label htmlFor="visitor-name">THE NAME YOU WANT TO SHARE</label>
            <input id="visitor-name" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} autoComplete="name" required maxLength={80} />
            <p className="visitor-name-disclosure">This name and your visit will be visible to the page creator. Names are self-reported and are not verified.</p>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Opening your surprise…" : "Open my surprise"} <span>↗</span></button>
          </form>
          <span className="public-lock-caption">Your name is recorded for this page only.</span>
        </section>
      </main>
    );
  }

  if (!experience) {
    return (
      <main className="public-lock-page" style={{ "--wish-color": "#b86f69" } as React.CSSProperties}>
        <Link className="brand public-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <section className="public-lock-card">
          <span className="unlock-icon">⌑</span>
          <span className="eyebrow">A LITTLE SOMETHING IS WAITING</span>
          <h1>{recipient ? `${recipient}, this one’s just for you.` : "This one’s just for you."}</h1>
          <p>Someone made a little surprise. Ask them for the page code to open it.</p>
          <form onSubmit={unlock}>
            <label htmlFor="page-code">YOUR PAGE CODE</label>
            <input id="page-code" type="password" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={100} />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Opening…" : "Open my surprise"} <span>↗</span></button>
          </form>
          <span className="public-lock-caption">A private page, shared with care.</span>
        </section>
      </main>
    );
  }

  return (
    <main className={`public-experience template-${experience.template} mood-${experience.mood.toLowerCase()}`} style={{ "--wish-color": experience.color, "--wish-wash": moodWash(experience.mood) } as React.CSSProperties}>
      <MoodAtmosphere mood={experience.mood} />
      <header className="public-header"><Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><span>A little something, made with love</span></header>
      {previewStatus && (
        <aside className="creator-preview-banner">
          <span><strong>Creator preview</strong> · {previewStatus === "draft" ? "Draft — only you can see this" : "Only you can see this preview"}</span>
          <Link href={`/experiences/${experience.id}/edit`}>Edit this page ↗</Link>
        </aside>
      )}
      <ExperienceTemplate experience={experience} slug={slug} />
      {previewStatus && ownerFeedback && <OwnerPreviewFeedback feedback={ownerFeedback} />}
      {!previewStatus && <VisitorReviewForm slug={slug} />}
      <footer className="public-story-footer">Made especially for this moment · <Link href="/">my e-Wish</Link></footer>
    </main>
  );
}

function OwnerPreviewFeedback({ feedback }: { feedback: OwnerFeedback }) {
  return (
    <section className="owner-preview-feedback">
      <div className="owner-preview-feedback-heading">
        <div><span className="eyebrow">YOUR PAGE ACTIVITY</span><h2>Views & comments</h2></div>
        <Link href="/profile">Open my profile ↗</Link>
      </div>
      <div className="owner-preview-feedback-stats">
        <article><span>TOTAL VIEWS</span><strong>{feedback.totalViews}</strong><small>Unique visitor-browser registrations</small></article>
        <article><span>TOTAL COMMENTS</span><strong>{feedback.totalComments}</strong><small>Notes visitors left on this page</small></article>
      </div>
      {feedback.comments.length ? (
        <div className="owner-preview-comments">
          <h3>What visitors shared</h3>
          {feedback.comments.map((comment, index) => (
            <article key={`${comment.createdAt}-${index}`}>
              <div><span className="visitor-avatar" aria-hidden="true">{comment.visitorName.trim().charAt(0).toUpperCase() || "♡"}</span><strong>{comment.visitorName}</strong></div>
              <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
              <blockquote>{comment.message}</blockquote>
            </article>
          ))}
        </div>
      ) : (
        <div className="owner-preview-no-comments"><span>✿</span><p>No comments yet. Visitor notes will appear here.</p></div>
      )}
      <p className="owner-preview-disclosure">Views count registered visitor browsers for this wish, not every page refresh. Visitor names are self-reported.</p>
    </section>
  );
}

function formatCommentDate(value: string): string {
  const date = new Date(value);
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

function moodWash(mood: string): string {
  const washes: Record<string, string> = {
    Heartfelt: "#f0e2dc",
    Playful: "#f4ead5",
    Elegant: "#e5e9dd",
    Dreamy: "#ebe5f1",
    Encouraging: "#f3e5da",
  };
  return washes[mood] || washes.Heartfelt;
}
