import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const isAdmin = session.user.role === "support_admin" || session.user.role === "super_admin";
    redirect(isAdmin ? "/admin" : "/dashboard");
  }
  const { reset } = await searchParams;

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
      <section className="auth-card">
        <span className="eyebrow">WELCOME BACK</span>
        <h1>A little more <em>lovely.</em></h1>
        {reset === "success" && <p className="auth-success">Password changed. Sign in with your new password.</p>}
        <AuthForm mode="login" />
        <p className="auth-forgot"><Link href="/forgot-password">Forgot your password?</Link></p>
        <p className="auth-switch">New around here? <Link href="/register">Create an account</Link></p>
        <p className="auth-small">Sign-in is available after verifying your email.</p>
      </section>
    </main>
  );
}
