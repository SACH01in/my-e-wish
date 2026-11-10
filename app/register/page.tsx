import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const isAdmin = session.user.role === "support_admin" || session.user.role === "super_admin";
    redirect(isAdmin ? "/admin" : "/dashboard");
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
      <section className="auth-card">
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h1>Make a little <em>magic.</em></h1>
        <p className="auth-intro">Create an account to save your pages and share them with your favorite people.</p>
        <AuthForm mode="register" />
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
        <p className="auth-small">We’ll send a one-time email link to verify your address.</p>
      </section>
    </main>
  );
}
