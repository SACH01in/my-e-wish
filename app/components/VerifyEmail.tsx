"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Verifies only after the user deliberately clicks, avoiding link-scanner activation. */
export default function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Click below to verify this email address.");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That verification link is invalid or expired.");
      setMessage("Email verified. You can sign in now.");
      window.history.replaceState({}, "", "/login");
      window.setTimeout(() => router.push("/login"), 1100);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Email verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verify-email">
      <p className={failed ? "auth-error" : "auth-success"} role="status">{message}</p>
      {!failed && <button className="button button-dark auth-submit" type="button" onClick={verify} disabled={busy}>{busy ? "Verifying…" : "Verify my email"} <span>↗</span></button>}
    </div>
  );
}
