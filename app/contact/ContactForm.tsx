"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your message could not be sent.");
      setStatus(result.message || "Thanks for reaching out. Your message has been sent.");
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="contact-form-heading">
        <span className="eyebrow">SEND A LITTLE NOTE</span>
        <h2>What’s on your mind?</h2>
        <p>Your message goes straight to the creator’s inbox.</p>
      </div>
      <label htmlFor="contact-name">Your name</label>
      <input id="contact-name" name="name" autoComplete="name" maxLength={80} required />
      <label htmlFor="contact-email">Your email</label>
      <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      <label htmlFor="contact-message">Your message</label>
      <textarea id="contact-message" name="message" rows={5} maxLength={5000} required />
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <p className="contact-form-error" role="alert">{error}</p>}
      {status && <p className="contact-form-success" role="status">{status}</p>}
      <button className="button button-dark contact-submit" type="submit" disabled={sending}>
        {sending ? "Sending your note…" : "Send message"} <span aria-hidden="true">↗</span>
      </button>
      <p className="contact-privacy-note">Your message is emailed to the creator and is not saved in your my e-Wish account.</p>
    </form>
  );
}
