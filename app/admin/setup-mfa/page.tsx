import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminMfaSetup from "@/app/components/AdminMfaSetup";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminMfaSetupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!["support_admin", "super_admin"].includes(session.user.role)) notFound();
  if (session.user.mfaEnabled) redirect("/admin");

  return <main className="auth-page"><Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><section className="auth-card admin-mfa-card"><span className="eyebrow">KEEP SUPPORT ACCESS SAFE</span><h1>Set up <em>two-step sign-in.</em></h1><p className="auth-intro">Admin access requires an authenticator app. Scan the code, verify it, and save your recovery codes somewhere safe.</p><AdminMfaSetup /></section></main>;
}
