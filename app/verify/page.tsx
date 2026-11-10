import Link from "next/link";
import VerifyEmail from "@/app/components/VerifyEmail";

export const metadata = { robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
      <section className="auth-card">
        <span className="eyebrow">ONE LAST LITTLE STEP</span>
        <h1>Verify your <em>email.</em></h1>
        {token && token.length <= 100
          ? <VerifyEmail token={token} />
          : <p className="auth-error">This verification link is missing or invalid.</p>}
      </section>
    </main>
  );
}
