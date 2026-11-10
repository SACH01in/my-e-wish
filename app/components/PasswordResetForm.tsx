"use client";

import { FormEvent, useState } from "react";

export default function PasswordResetForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(token ? "/api/password-reset/confirm" : "/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password } : { email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The request could not be completed.");
      setMessage(token ? "Your password was changed. You can now sign in." : result.message);
      if (token) window.history.replaceState({}, "", "/login?reset=success");
    } catch (requestError) {
      setError(true);
      setMessage(requestError instanceof Error ? requestError.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (token && token.length > 100) return <p className="auth-error">This reset link is invalid or expired.</p>;
  return (
    <form className="auth-form" onSubmit={submit}>
      {token
        ? <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required /><small>Use at least 12 characters.</small></label>
        : <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>}
      {message && <p className={error ? "auth-error" : "auth-success"} role="status">{message}</p>}
      <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : token ? "Save new password" : "Send reset link"} <span>↗</span></button>
    </form>
  );
}
