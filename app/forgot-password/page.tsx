import Link from "next/link";
import PasswordResetForm from "@/app/components/PasswordResetForm";

export const metadata = { robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <main className="auth-page"><Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><section className="auth-card"><span className="eyebrow">IT HAPPENS</span><h1>A fresh <em>start.</em></h1><p className="auth-intro">If you have a verified account, we’ll email you a one-time password reset link.</p><PasswordResetForm /><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}
