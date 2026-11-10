import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import ProfileAvatarLink from "@/app/components/ProfileAvatarLink";

const moods = [
  { title: "Heartfelt", note: "Warm & meaningful", mark: "♡", className: "mood-card-1" },
  { title: "Playful", note: "Bright & joyful", mark: "✳", className: "mood-card-2" },
  { title: "Elegant", note: "A little more polished", mark: "✧", className: "mood-card-3" },
  { title: "Dreamy", note: "Soft & magical", mark: "☾", className: "mood-card-4" },
  { title: "Encouraging", note: "Here for your next chapter", mark: "☀", className: "mood-card-5" },
];

export const metadata: Metadata = {
  title: "Personalized Birthday & Surprise Pages",
  description:
    "Make a personalized birthday, anniversary, wedding, or just-because page with your photos, words, mood, and a special hidden surprise.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Personalized Birthday & Surprise Pages | my e-Wish",
    description:
      "Make a personalized birthday, anniversary, wedding, or just-because page with your photos, words, mood, and a special hidden surprise.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Personalized Birthday & Surprise Pages | my e-Wish",
    description:
      "Make a personalized birthday, anniversary, wedding, or just-because page with your photos, words, mood, and a special hidden surprise.",
  },
};

/** Human-authored marketing page; no generated messages or browser data storage. */
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const createHref = session?.user ? "/create" : "/register";
  const isAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "Create personalized digital wishes and surprise pages for life's meaningful moments.",
      },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web browser",
        description:
          "A web app for creating personalized, mood-based greeting and surprise pages.",
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
          <nav className="main-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#moods">Find your mood</a><Link href="/demo">See a demo</Link></nav>
          <div className="nav-actions">
            {session?.user
              ? <><Link className="nav-signin nav-dashboard" href={isAdmin ? "/admin" : "/dashboard"}>{isAdmin ? "Admin console ↗" : "My moments ↗"}</Link><ProfileAvatarLink name={session.user.name || session.user.email || ""} role={session.user.role} /></>
              : <Link className="nav-signin" href="/login">Sign in</Link>}
            <Link className="button button-dark button-small topbar-create-cta" href={createHref}>Make a wish <span>↗</span></Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="tiny-note"><span className="note-star">✳</span> MADE FOR ONE PERSON. REMEMBERED FOR YEARS.</div>
          <h1>A little page.<br />A <em>big feeling.</em></h1>
          <p className="hero-description">Turn a birthday, a brave new beginning, or a just-because into something they can keep. Your words, your favorite photos, and a little surprise tucked inside.</p>
          <div className="hero-buttons"><Link className="button button-dark" href={createHref}>Make their moment <span>↗</span></Link><Link className="quiet-link" href="/demo">Explore the live demo <span>↗</span></Link></div>
          <div className="made-with-love"><span>♡</span> No perfect words needed. Just yours.</div>
        </div>
        <div className="hero-art" aria-label="A personalized keepsake page made with a favorite photo and a heartfelt note">
          <div className="hero-halo" aria-hidden="true" />
          <div className="hero-photo-frame">
            <img
              className="hero-photo"
              src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=85"
              alt="Two hands forming a heart around the golden setting sun"
              fetchPriority="high"
            />
            <div className="hero-photo-shade" />
            <span className="hero-photo-label">A MOMENT, JUST FOR YOU</span>
            <p className="hero-photo-caption">Keep this<br /><em>feeling close.</em></p>
            <span className="hero-photo-mark" aria-hidden="true">✳</span>
          </div>
          <article className="hero-note-card">
            <span className="hero-note-mark" aria-hidden="true">♡</span>
            <div><span className="hero-note-label">A LITTLE NOTE FOR MAYA</span><p>“You make ordinary days feel like the best ones.”</p></div>
            <span className="hero-note-sparkle" aria-hidden="true">✦</span>
          </article>
          <div className="hero-memory-chip"><span aria-hidden="true">↗</span> one of your favorite memories</div>
        </div>
        <a className="hero-scroll" href="#how-it-works"><span /> A LITTLE MORE BELOW</a>
      </section>

      <section className="ticker" aria-label="Occasions"><div className="ticker-track">{["Birthdays", "Little victories", "Just because", "Anniversaries", "New beginnings", "The in-between moments"].map((item) => <span key={item}>{item} <i>✳</i></span>)}</div></section>

      <section className="mood-section section-wrap" id="moods">
        <div className="section-heading"><div><span className="eyebrow">START WITH A FEELING</span><h2>What does this moment <em>feel like?</em></h2></div><p>No two people are the same. Pick a mood and we’ll find a lovely place to start.</p></div>
        <div className="mood-grid">{moods.map((mood) => <Link className={`mood-card ${mood.className}`} href={createHref} key={mood.title}><span className="mood-symbol">{mood.mark}</span><span className="mood-name">{mood.title}</span><span className="mood-note">{mood.note}</span><span className="mood-arrow">↗</span></Link>)}</div>
      </section>

      <section className="how-section" id="how-it-works"><div className="how-inner">
        <div className="how-intro"><span className="eyebrow">NOT ANOTHER TEMPLATE</span><h2>A little more<br /><em>you-shaped.</em></h2><p>It takes a few minutes to make something that feels like it took all day.</p><Link className="button button-light" href={createHref}>Make something lovely ↗</Link></div>
        <div className="steps"><article className="step"><span className="step-icon">01</span><div><h3>Pick your person & moment</h3><p>Birthday, big win, or no reason at all. Start wherever your heart is.</p></div><span className="step-doodle">♡</span></article><article className="step"><span className="step-icon">02</span><div><h3>Make it unmistakably them</h3><p>Your words, your colors, your photos. Little details make the whole thing.</p></div><span className="step-doodle">✳</span></article><article className="step"><span className="step-icon">03</span><div><h3>Leave a little something hidden</h3><p>Tuck a note, quote, memory photo, or a question game inside.</p></div><span className="step-doodle">✧</span></article><article className="step"><span className="step-icon">04</span><div><h3>Send it. Make their day.</h3><p>Your page has its own link, ready to share with your favorite human.</p></div><span className="step-doodle">↗</span></article></div>
      </div></section>

      <section className="quote-section"><span className="quote-mark">“</span><blockquote>The little things are the big things.</blockquote><p>A good note has a way of finding its person.</p><span className="quote-flower flower-one">✳</span><span className="quote-flower flower-two">✿</span></section>

      <section className="closing-cta"><span className="closing-star">✳</span><span className="eyebrow">THERE’S ALWAYS A REASON</span><h2>Go make someone<br /><em>feel loved.</em></h2><Link className="button button-dark" href={createHref}>Start with a little hello <span>↗</span></Link><p>No perfect words required. Just yours.</p></section>
      <footer className="footer"><Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link><span>For the people who make life lovely. <i>♡</i></span><nav className="footer-links" aria-label="Footer navigation"><Link href="/demo">See a demo</Link><Link href="/contact">Contact the creator</Link>{session?.user ? <Link href="/dashboard">Your moments ↗</Link> : <Link href="/register">Create an account ↗</Link>}</nav></footer>
    </main>
  );
}
