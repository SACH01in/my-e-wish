"use client";

import { FormEvent, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/** Handles registration and sign-in feedback without exposing provider errors. */
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Your account could not be created.");
        setMessage(result.message);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        authenticatorCode,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (result?.error) throw new Error("We couldn't sign you in. Check your details and verify your email.");
      const session = await getSession();
      if (!session?.user?.id) throw new Error("Your sign-in session could not be verified. Please sign in again.");
      const isAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
      router.push(isAdmin ? "/admin" : "/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>}
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
      <label>Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : 1} maxLength={128} required />{mode === "register" && <small>Use at least 12 characters.</small>}</label>
      {mode === "login" && <label>Authenticator / recovery code <span className="optional-label">(admins only)</span><input inputMode="numeric" autoComplete="one-time-code" value={authenticatorCode} onChange={(event) => setAuthenticatorCode(event.target.value)} maxLength={32} placeholder="6-digit code or recovery code" /></label>}
      {message && <p className={message.startsWith("Check your inbox") ? "auth-success" : "auth-error"} role="status">{message}</p>}
      <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "register" ? "Create my account" : "Sign in"} <span>↗</span></button>
    </form>
  );
}
