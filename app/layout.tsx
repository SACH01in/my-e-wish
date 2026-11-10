import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "my e-Wish — Make a moment unforgettable",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Create a personalized birthday, anniversary, wedding, achievement, or just-because surprise page. Choose a mood, add your photos and words, and share a keepsake.",
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  keywords: [
    "personalized birthday wishes",
    "online surprise page",
    "anniversary wishes",
    "wedding wishes",
    "shareable greeting page",
    "custom digital greeting",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: "my e-Wish — Make a moment unforgettable",
    description:
      "Create a personalized surprise page for birthdays, anniversaries, achievements, and all the moments worth celebrating.",
  },
  twitter: {
    card: "summary",
    title: "my e-Wish — Make a moment unforgettable",
    description:
      "Create a personalized surprise page for birthdays, anniversaries, achievements, and all the moments worth celebrating.",
  },
  referrer: "strict-origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
