import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";
import CreatorPhoto from "./CreatorPhoto";

export const metadata: Metadata = {
  title: "Contact the creator",
  description: "Contact Sachin Singh, creator of my e-Wish, with questions or feedback about the personalized wishes and surprise-page website.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact the creator | my e-Wish",
    description: "Contact Sachin Singh with questions or feedback about my e-Wish.",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact the creator | my e-Wish",
    description: "Contact Sachin Singh with questions or feedback about my e-Wish.",
  },
};

const creatorLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sachin-singh-8b9913264?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { label: "GitHub", href: "https://github.com/SACH01in/" },
  { label: "Instagram", href: "https://www.instagram.com/sachinsingh___001/" },
];

export default function ContactPage() {
  return (
    <main className="contact-page">
      <header className="contact-header">
        <Link className="brand" href="/">
          <span className="brand-mark">e</span>
          <span>my e-Wish</span>
        </Link>
        <Link className="contact-back" href="/">← Back to my e-Wish</Link>
      </header>

      <section className="contact-card" aria-labelledby="contact-title">
        <div className="contact-creator">
          <CreatorPhoto />
          <span className="eyebrow">A NOTE FROM THE CREATOR</span>
          <h1 id="contact-title">Hello, I’m <em>Sachin.</em></h1>
          <p className="contact-intro">
            I created my e-Wish to help people make meaningful moments feel a
            little more personal. For questions or feedback about the website,
            you’re welcome to reach out.
          </p>

          <a className="contact-email" href="mailto:sachinsingh11410129@gmail.com">
            <span>Email</span>
            <strong>sachinsingh11410129@gmail.com</strong>
            <span aria-hidden="true">↗</span>
          </a>

          <nav className="contact-socials" aria-label="Creator social profiles">
            {creatorLinks.map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                {label}<span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
          <Link className="contact-home-link" href="/">Back to making lovely moments</Link>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
