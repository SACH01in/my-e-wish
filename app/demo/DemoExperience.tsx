"use client";

import Link from "next/link";
import { useState } from "react";
import type { Mood } from "@/lib/types";
import { moodThemes } from "@/lib/themes";

const moods: Mood[] = ["Heartfelt", "Playful", "Elegant", "Dreamy", "Encouraging"];

const moments: Record<Mood, {
  occasion: string;
  recipient: string;
  headline: string;
  message: string;
  sender: string;
  image: string;
  imageAlt: string;
  secretTitle: string;
  secret: string;
  motif: string;
}> = {
  Heartfelt: {
    occasion: "A birthday, from your oldest friend",
    recipient: "Maya",
    headline: "You still make every place feel like home.",
    message: "I found that photo from the night we missed the last train and laughed all the way back. I hope this year brings you a hundred more stories we’ll tell badly and remember perfectly.",
    sender: "Nina, since the midnight-train days",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Two friends sharing a warm, joyful moment",
    secretTitle: "Open this when you miss our old adventures",
    secret: "I still have the crumpled train ticket in my blue journal. Next time, I’m bringing snacks and checking the timetable. Love you, always.",
    motif: "♡",
  },
  Playful: {
    occasion: "A tiny victory worth a big fuss",
    recipient: "Jordan",
    headline: "You did the scary thing. Icon behavior.",
    message: "Three months of practice, one very dramatic pep-talk playlist, and you absolutely nailed your first open-mic set. The person in row two who laughed at the wrong moment? Definitely me. I regret nothing.",
    sender: "Your loudest fan, Priya",
    image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "A colorful live music crowd celebrating",
    secretTitle: "Tap for your extremely official award",
    secret: "By the authority vested in me by our kitchen karaoke nights: you are hereby awarded one shiny gold star and first pick of the celebratory dumplings.",
    motif: "✳",
  },
  Elegant: {
    occasion: "An anniversary, just the two of you",
    recipient: "Amara",
    headline: "Still my favorite yes.",
    message: "Another year of the Sunday-market flowers you pretend not to notice, the long way home, and making an ordinary Tuesday feel like ours. I would choose this life with you again.",
    sender: "Always, Jules",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "An intimate wedding celebration in warm evening light",
    secretTitle: "A small promise for our next year",
    secret: "One weekend with no plans, no rushing, and a table by the window somewhere new. I’ll book it. You pick the place.",
    motif: "✧",
  },
  Dreamy: {
    occasion: "For the night-sky daydreamer",
    recipient: "Leo",
    headline: "Keep making room for wonder.",
    message: "You taught me that a walk home can become an expedition if you take the path under the trees. May this next chapter bring you quiet mornings, open windows, and a little more sky.",
    sender: "In your orbit, Sam",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "A softly glowing landscape at sunrise",
    secretTitle: "There’s a wish tucked in the starlight",
    secret: "I made us a playlist for the next meteor shower. Track seven is the song you hummed on the roof that night. You’ll know when it starts.",
    motif: "☾",
  },
  Encouraging: {
    occasion: "A note for a brave new beginning",
    recipient: "Alex",
    headline: "Look how far your brave has brought you.",
    message: "Tomorrow is the first day at the new studio. You don’t have to know every next step yet; you just have to bring the care and stubborn hope that got you here. The rest can unfold.",
    sender: "In your corner, always — Ren",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "A sunlit mountain landscape opening toward the horizon",
    secretTitle: "For the morning you need a reminder",
    secret: "You saved the first sketch you ever showed me. I kept it too. You were already on your way then, even if you couldn’t see it yet.",
    motif: "☼",
  },
};

export default function DemoExperience() {
  const [mood, setMood] = useState<Mood>("Heartfelt");
  const [revealed, setRevealed] = useState(false);
  const moment = moments[mood];
  const theme = moodThemes[mood];

  function chooseMood(nextMood: Mood) {
    setMood(nextMood);
    setRevealed(false);
  }

  return (
    <main className={`demo-page demo-${mood.toLowerCase()}`} style={{ "--wish-color": theme.color, "--wish-wash": theme.wash } as React.CSSProperties}>
      <header className="demo-header">
        <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <span className="demo-header-note">A little preview, made with feeling</span>
        <Link className="demo-back" href="/">← Back to my e-Wish</Link>
      </header>

      <section className="demo-intro">
        <span className="eyebrow">A MOMENT, IN FIVE DIFFERENT FEELINGS</span>
        <h1>Same kind of love.<br /><em>Entirely different worlds.</em></h1>
        <p>Choose a mood. Notice how the light, layout, and little details change—not just the color.</p>
        <div className="demo-mood-picker" aria-label="Choose a demo mood">
          {moods.map((option) => (
            <button type="button" key={option} className={`demo-mood-button${mood === option ? " is-active" : ""}`} onClick={() => chooseMood(option)} aria-pressed={mood === option}>
              <span aria-hidden="true">{moments[option].motif}</span>{option}
            </button>
          ))}
        </div>
      </section>

      <div className="demo-stage">
        <div className="demo-atmosphere" aria-hidden="true"><span>{moments[mood].motif}</span><span>{moments[mood].motif}</span><span>{moments[mood].motif}</span></div>
        <article className="demo-card" key={mood}>
          <div className="demo-card-image-wrap">
            <img className="demo-card-image" src={moment.image} alt={moment.imageAlt} />
            <span className="demo-image-occasion">{moment.occasion}</span>
            <span className="demo-image-stamp" aria-hidden="true">{moment.motif}</span>
          </div>
          <div className="demo-card-copy">
            <span className="demo-card-kicker">MADE JUST FOR {moment.recipient.toUpperCase()}</span>
            <span className="demo-card-ornament" aria-hidden="true">{moment.motif}</span>
            <h2>{moment.recipient},<br /><em>{moment.headline}</em></h2>
            <p className="demo-message">{moment.message}</p>
            <p className="demo-signoff">{moment.sender}</p>
            <div className={`demo-secret${revealed ? " is-revealed" : ""}`}>
              {revealed ? (
                <div className="demo-secret-note" aria-live="polite">
                  <span>{mood === "Dreamy" ? "A WISH FROM THE ROOFTOP" : mood === "Playful" ? "OFFICIAL BEST-FRIEND BUSINESS" : "A NOTE, JUST BETWEEN US"}</span>
                  <p>{moment.secret}</p>
                </div>
              ) : (
                <button className="demo-reveal-button" type="button" onClick={() => setRevealed(true)}>
                  <span className="demo-reveal-icon" aria-hidden="true">{moments[mood].motif}</span>
                  <span><strong>{moment.secretTitle}</strong><small>A detail only your person would recognize</small></span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>
          </div>
        </article>
        <span className="demo-stage-caption">A sample page · the words and photos are here to show the feeling</span>
      </div>

      <section className="demo-bottom">
        <p>Real surprises come from the little things only you know.</p>
        <Link className="button button-dark" href="/register">Make one that’s yours <span>↗</span></Link>
      </section>
    </main>
  );
}
