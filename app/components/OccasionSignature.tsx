import type { Occasion } from "@/lib/types";

const occasionDetails: Record<Occasion, { mark: string; caption: string; style: string }> = {
  Birthday: { mark: "✹", caption: "A day made for celebrating you", style: "birthday" },
  Anniversary: { mark: "∞", caption: "Another chapter, chosen together", style: "anniversary" },
  Wedding: { mark: "❧", caption: "A beautiful beginning together", style: "wedding" },
  Achievement: { mark: "✦", caption: "This moment is yours to celebrate", style: "achievement" },
  Goal: { mark: "↗", caption: "One brave step closer", style: "goal" },
  "Special moment": { mark: "◌", caption: "Keep this moment close", style: "special" },
  "Just because": { mark: "♡", caption: "No occasion needed", style: "just-because" },
  "New beginning": { mark: "☼", caption: "Here’s to a fresh beginning", style: "new-beginning" },
  "Something else": { mark: "✳", caption: "A moment worth making yours", style: "custom" },
};

export default function OccasionSignature({ occasion, customOccasion }: {
  occasion: Occasion;
  customOccasion: string;
}) {
  const details = occasionDetails[occasion];
  const label = occasion === "Something else" && customOccasion ? customOccasion : occasion;

  return (
    <div className={`occasion-signature occasion-${details.style}`}>
      <span className="occasion-signature-mark" aria-hidden="true">{details.mark}</span>
      <span className="occasion-signature-copy">
        <strong>{label}</strong>
        <small>{occasion === "Something else" && customOccasion ? "A one-of-a-kind celebration" : details.caption}</small>
      </span>
    </div>
  );
}
