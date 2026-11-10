import type { Mood } from "@/lib/types";

const moodDetails: Record<Mood, { icons: [string, string, string]; label: string }> = {
  Heartfelt: { icons: ["♡", "♥", "♡"], label: "warm keepsake details" },
  Playful: { icons: ["✳", "✦", "✿"], label: "bright celebratory details" },
  Elegant: { icons: ["✧", "❧", "✧"], label: "botanical details" },
  Dreamy: { icons: ["☾", "✦", "✧"], label: "moonlit details" },
  Encouraging: { icons: ["☼", "✧", "↗"], label: "sunrise details" },
};

export default function MoodAtmosphere({ mood }: { mood: Mood }) {
  const details = moodDetails[mood];

  return (
    <div className={`mood-atmosphere atmosphere-${mood.toLowerCase()}`} aria-hidden="true" data-mood-label={details.label}>
      {details.icons.map((icon, index) => (
        <span key={`${icon}-${index}`} className={`atmosphere-mark atmosphere-mark-${index + 1}`} aria-hidden="true">
          {icon}
        </span>
      ))}
    </div>
  );
}
