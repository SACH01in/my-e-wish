"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";

type Experience = { id: string; slug: string; headline: string; recipient: string; isPrivate: boolean; occasion: string; mood: string; owner: string };
type AuditEntry = { action: string; reason: string; createdAt: string };

/** Requests owner-notified access instead of providing a hidden admin bypass. */
export default function AdminConsole({ adminName, experiences, audit }: { adminName: string; experiences: Experience[]; audit: AuditEntry[] }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function requestAccess(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/experiences/${id}/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasons[id] || "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Access was not granted.");
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Access was not granted.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar"><Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><div><span className="dashboard-greeting">Support · {adminName}</span><button className="dashboard-signout" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button></div></header>
      <section className="admin-content">
        <div className="dashboard-heading"><div><span className="eyebrow">SUPPORT ACCESS · AUDITED</span><h1>Help with <em>care.</em></h1><p>Page access requires a reason, lasts 15 minutes, and notifies the owner by email.</p></div></div>
        {message && <p className="auth-error" role="alert">{message}</p>}
        <div className="admin-experiences">{experiences.map((experience) => <article className="admin-experience" key={experience.id}>
          <div><span className="eyebrow">{experience.occasion} · {experience.mood}{experience.isPrivate ? " · PRIVATE" : ""}</span><h2>{experience.headline}</h2><p>For {experience.recipient || "a recipient"} · Owner: {experience.owner}</p></div>
          <label>Why do you need access?<textarea rows={2} minLength={10} maxLength={500} value={reasons[experience.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [experience.id]: event.target.value }))} placeholder="Describe the customer's support request." /></label>
          <button className="button button-dark" disabled={busy === experience.id || (reasons[experience.id] || "").trim().length < 10} onClick={() => void requestAccess(experience.id)}>{busy === experience.id ? "Requesting…" : "Request 15-minute access"} <span>↗</span></button>
        </article>)}</div>
        {!experiences.length && <div className="dashboard-empty"><h2>No published pages yet.</h2><p>Published customer pages appear here when support is needed.</p></div>}
        <section className="admin-audit"><span className="eyebrow">YOUR RECENT SUPPORT ACTIONS</span>{audit.length ? audit.map((entry, index) => <div key={`${entry.createdAt}-${index}`}><strong>{entry.action.replaceAll("_", " ")}</strong><span>{entry.reason || "No reason recorded"} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</span></div>) : <p>No support access activity recorded.</p>}</section>
      </section>
    </main>
  );
}
