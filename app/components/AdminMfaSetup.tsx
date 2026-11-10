"use client";

import { useState } from "react";

/** Guides a first-time administrator through TOTP enrollment and recovery-code storage. */
export default function AdminMfaSetup() {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function beginSetup() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/mfa/setup", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Authenticator setup could not start.");
      setQrCode(result.qrCode);
      setSecret(result.secret);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Authenticator setup could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That code could not be verified.");
      setRecoveryCodes(result.recoveryCodes);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mfa-setup">
      {!qrCode && <button className="button button-dark auth-submit" disabled={busy} onClick={() => void beginSetup()}>{busy ? "Preparing…" : "Set up authenticator"} <span>↗</span></button>}
      {qrCode && !recoveryCodes.length && <><img className="mfa-qr" src={qrCode} alt="Authenticator enrollment QR code" /><p className="mfa-manual">Can’t scan it? Enter this setup key manually:<br /><code>{secret}</code></p><form className="auth-form" onSubmit={confirmSetup}><label>Six-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required /></label><button className="button button-dark auth-submit" disabled={busy}>{busy ? "Checking…" : "Verify and enable MFA"} <span>↗</span></button></form></>}
      {recoveryCodes.length > 0 && <div className="recovery-codes"><p className="auth-success">MFA is enabled. Save these recovery codes now; they will only be shown once.</p><pre>{recoveryCodes.join("\n")}</pre><button className="button button-dark auth-submit" onClick={() => window.location.assign("/login")}>I saved them — sign in again <span>↗</span></button></div>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
