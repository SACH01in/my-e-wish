"use client";

import { FormEvent, useState } from "react";

export default function VisitorReviewForm({ slug }: { slug: string }) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendReview();
  }

  async function sendReview() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your note could not be shared.");
      setSubmitted(true);
      setNotificationSent(Boolean(result.notificationSent));
      setNotice(result.notificationSent
        ? result.alreadySubmitted ? "Your note has already been shared with the creator." : "Thank you. Your note was shared with the creator."
        : result.message || "Your note is saved for the creator, but its email notification could not be sent right now.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your note could not be shared.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="visitor-review-form" aria-labelledby="visitor-review-heading">
      <span className="eyebrow">A NOTE BACK</span>
      <h2 id="visitor-review-heading">What did this wish make you feel?</h2>
      <p>Leave a little note for the creator. They’ll see it on their profile and receive an email.</p>
      {submitted && <p className="visitor-review-notice" role="status">{notice}</p>}
      {!submitted || !notificationSent ? (
        <form onSubmit={submitReview}>
          <label className="sr-only" htmlFor="visitor-review-message">Your comment for the creator</label>
          <textarea
            id="visitor-review-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share what you thought or how it made you feel…"
            minLength={2}
            maxLength={1500}
            rows={4}
            required={!submitted}
            disabled={submitted}
          />
          {!submitted && notice && <p className="auth-error" role="alert">{notice}</p>}
          {!submitted && <div className="visitor-review-submit-row">
            <small>Your name and comment will be visible to the creator.</small>
            <button className="button button-dark button-small" type="submit" disabled={busy || message.trim().length < 2}>{busy ? "Sending…" : "Share my note ↗"}</button>
          </div>}
          {submitted && !notificationSent && <div className="visitor-review-submit-row">
            <small>Your note is saved and won’t be duplicated.</small>
            <button className="button button-dark button-small" type="button" onClick={() => void sendReview()} disabled={busy}>{busy ? "Retrying…" : "Retry email notification ↗"}</button>
          </div>}
        </form>
      ) : null}
    </section>
  );
}
