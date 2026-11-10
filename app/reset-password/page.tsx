import Link from "next/link";
import PasswordResetForm from "@/app/components/PasswordResetForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="auth-page"><Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><section className="auth-card"><span className="eyebrow">A NEW LITTLE KEY</span><h1>Choose a new <em>password.</em></h1>{token ? <PasswordResetForm token={token} /> : <p className="auth-error">This reset link is missing or invalid.</p>}<p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}
