import type { Metadata } from "next";
import DemoExperience from "./DemoExperience";

export const metadata: Metadata = {
  title: "Explore the Mood-Based Surprise Page Demo",
  description: "Preview a personalized surprise page and see how Heartfelt, Playful, Elegant, Dreamy, and Encouraging moods change its design.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Explore the Mood-Based Surprise Page Demo | my e-Wish",
    description: "See how five moods transform a personalized digital greeting and surprise page.",
    url: "/demo",
  },
  twitter: {
    card: "summary",
    title: "Explore the Mood-Based Surprise Page Demo | my e-Wish",
    description: "See how five moods transform a personalized digital greeting and surprise page.",
  },
};

export default function DemoPage() {
  return <DemoExperience />;
}
