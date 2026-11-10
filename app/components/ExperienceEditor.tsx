"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { moodThemes } from "@/lib/themes";
import type { Mood, Occasion, SurpriseBlock, SurpriseKind, TemplateId } from "@/lib/types";
import MoodAtmosphere from "@/app/components/MoodAtmosphere";
import ExperienceTemplate from "@/app/components/ExperienceTemplates";
import { wishCategories, wishLibrary, type WishCategory } from "@/lib/wish-library";

type Experience = {
  id?: string;
  slug?: string;
  occasion: Occasion;
  customOccasion: string;
  mood: Mood;
  template: TemplateId;
  recipient: string;
  from: string;
  headline: string;
  message: string;
  surprises: SurpriseBlock[];
  isPrivate: boolean;
  image: string;
  color: string;
  status: "draft" | "published";
};

const moods: Mood[] = ["Heartfelt", "Playful", "Elegant", "Dreamy", "Encouraging"];
const occasions: Occasion[] = ["Birthday", "Anniversary", "Wedding", "Achievement", "Goal", "Special moment", "Just because", "New beginning", "Something else"];
const moodProfiles: Record<Mood, { mark: string; note: string }> = {
  Heartfelt: { mark: "♡", note: "Soft paper & keepsake details" },
  Playful: { mark: "✳", note: "Bright color & lively accents" },
  Elegant: { mark: "❧", note: "Botanical lines & fine borders" },
  Dreamy: { mark: "☾", note: "Moonlit layers & soft glow" },
  Encouraging: { mark: "☼", note: "Sunrise warmth & bold details" },
};
const occasionProfiles: Record<Occasion, { mark: string; note: string; style: string }> = {
  Birthday: { mark: "✹", note: "A day made for you", style: "birthday" },
  Anniversary: { mark: "∞", note: "Another chapter together", style: "anniversary" },
  Wedding: { mark: "❧", note: "A beautiful beginning", style: "wedding" },
  Achievement: { mark: "✦", note: "Celebrate how far you came", style: "achievement" },
  Goal: { mark: "↗", note: "One brave step forward", style: "goal" },
  "Special moment": { mark: "◌", note: "Keep it close", style: "special" },
  "Just because": { mark: "♡", note: "No reason required", style: "just-because" },
  "New beginning": { mark: "☼", note: "A fresh page", style: "new-beginning" },
  "Something else": { mark: "✳", note: "Make it your own", style: "custom" },
};
const palette = ["#b86f69", "#778b75", "#e2ad62", "#9480ac", "#5b7f91", "#d47e55"];
const blankExperience = (): Experience => ({
  occasion: "Birthday",
  customOccasion: "",
  mood: "Heartfelt",
  template: "letter",
  recipient: "",
  from: "",
  headline: "A little note, just for you",
  message: "",
  surprises: [{ id: crypto.randomUUID(), kind: "note", title: "There’s one more thing…", body: "" }],
  isPrivate: false,
  image: "",
  color: moodThemes.Heartfelt.color,
  status: "draft",
});

const newSurprises: Record<SurpriseKind, Omit<SurpriseBlock, "id">> = {
  note: { kind: "note", title: "There’s one more thing…", body: "" },
  quote: { kind: "quote", title: "", body: "" },
  question: { kind: "question", title: "", body: "I’m so glad that moment brought us together.", answer: "", hint: "" },
  memory: { kind: "memory", title: "", body: "" },
};

/** Keeps the complete creator flow in one form while the server owns persistence. */
export default function ExperienceEditor({ initial, initialSender = "" }: { initial?: Experience; initialSender?: string }) {
  const router = useRouter();
  const [value, setValue] = useState<Experience>(initial || blankExperience());
  const [creatorReady, setCreatorReady] = useState(Boolean(initial));
  const [creatorName, setCreatorName] = useState(initial?.from ?? initialSender);
  const [suggestionCategory, setSuggestionCategory] = useState<WishCategory>("Happy");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");

  function update<Key extends keyof Experience>(key: Key, next: Experience[Key]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  function updateBlock(id: string, key: keyof Omit<SurpriseBlock, "id">, next: string) {
    setValue((current) => ({
      ...current,
      surprises: current.surprises.map((block) => block.id === id ? { ...block, [key]: next } : block),
    }));
  }

  function addBlock(kind: SurpriseKind) {
    setValue((current) => ({ ...current, surprises: [...current.surprises, { ...newSurprises[kind], id: crypto.randomUUID() }] }));
  }

  async function uploadImage(file: File, target: "cover" | string) {
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be smaller than 8 MB.");
      return;
    }
    setUploading(target);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Image upload failed.");
      if (target === "cover") update("image", result.image);
      else updateBlock(target, "body", result.image);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading("");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isExisting = Boolean(value.id);
      const url = isExisting ? `/api/experiences/${value.id}` : "/api/experiences";
      const { id: _id, slug: _slug, ...experienceContent } = value;
      const payload = { ...experienceContent, accessCode: accessCode || undefined };
      const response = await fetch(url, {
        method: isExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your page could not be saved.");
      router.push("/dashboard");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your page could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const theme = moodThemes[value.mood];

  if (!creatorReady) {
    return (
      <main className="creator-intro-page">
        <header className="editor-page-header">
          <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
          <Link href="/dashboard" className="editor-cancel">← Back to my moments</Link>
        </header>
        <section className="creator-intro-card">
          <span className="creator-intro-mark" aria-hidden="true">♡</span>
          <span className="eyebrow">FIRST, A LITTLE INTRODUCTION</span>
          <h1>Who is this wish <em>from?</em></h1>
          <p>We’ll add your name to the page so your person knows who made this moment for them.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            update("from", creatorName.trim());
            setCreatorReady(true);
          }}>
            <label htmlFor="creator-name">YOUR NAME</label>
            <input id="creator-name" value={creatorName} onChange={(event) => setCreatorName(event.target.value)} autoComplete="name" maxLength={80} required />
            <button className="button button-dark" type="submit">Let’s make a wish <span>↗</span></button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="editor-page" style={{ "--editor-color": value.color, "--editor-wash": theme.wash } as React.CSSProperties}>
      <header className="editor-page-header">
        <Link className="brand" href="/"><span className="brand-mark">e</span><span>my e-Wish</span></Link>
        <Link href="/dashboard" className="editor-cancel">← Back to my moments</Link>
      </header>
      <div className="editor-page-title"><span className="eyebrow">A LITTLE SOMETHING, MADE BY YOU</span><h1>Make a moment <em>lovely.</em></h1><p>Choose the feeling, shape the page, then add a few surprises that feel like you.</p></div>
      <form className="experience-form" onSubmit={save}>
        <div className="experience-fields">
          <section className="form-panel">
            <span className="form-step">01 · THE MOMENT</span>
            <h2>Start with the feeling.</h2>
            <span className="input-caption">Choose an occasion to give the page its own celebratory details.</span>
            <div className="occasion-options" role="group" aria-label="Choose an occasion">
              {occasions.map((occasion) => <button key={occasion} type="button" className={`occasion-choice occasion-choice-${occasionProfiles[occasion].style}${value.occasion === occasion ? " selected" : ""}`} onClick={() => update("occasion", occasion)} aria-pressed={value.occasion === occasion}>
                <span aria-hidden="true">{occasionProfiles[occasion].mark}</span><strong>{occasion}</strong><small>{occasionProfiles[occasion].note}</small>
              </button>)}
            </div>
            {value.occasion === "Something else" && <label>Name this moment<input value={value.customOccasion} onChange={(event) => update("customOccasion", event.target.value)} maxLength={60} required /></label>}
            <span className="input-caption">Choose a mood. We’ll find its colors and let you fine-tune them.</span>
            <div className="editor-moods" role="group" aria-label="Choose a mood">{moods.map((mood) => <button key={mood} type="button" className={`mood-choice mood-choice-${mood.toLowerCase()}${value.mood === mood ? " selected" : ""}`} onClick={() => setValue((current) => ({ ...current, mood, color: moodThemes[mood].color }))} aria-pressed={value.mood === mood}><span aria-hidden="true">{moodProfiles[mood].mark}</span><strong>{mood}</strong><small>{moodProfiles[mood].note}</small></button>)}</div>
            <span className="input-caption">Your little accent color</span>
            <div className="color-options">{palette.map((color) => <button type="button" key={color} className={`color-dot${value.color === color ? " color-selected" : ""}`} style={{ backgroundColor: color }} onClick={() => update("color", color)} aria-label={`Use color ${color}`} />)}</div>
          </section>

          <section className="form-panel">
            <span className="form-step">02 · THE PAGE</span>
            <h2>Make it feel like them.</h2>
            <span className="input-caption">Each layout places your photo, message, and surprises in a different way.</span>
            <div className="editor-templates">{[
              { id: "letter", title: "The little letter", text: "A lovely note, front and center." },
              { id: "postcard", title: "The postcard", text: "A picture-led hello from you." },
              { id: "keepsake", title: "The keepsake", text: "A framed page to hold onto." },
            ].map((item) => <button type="button" key={item.id} className={`template-choice${value.template === item.id ? " selected" : ""}`} onClick={() => update("template", item.id as TemplateId)}><span className={`template-mark template-mark-${item.id}`}>{item.id === "letter" ? "Aa" : item.id === "postcard" ? "✉" : "✧"}</span><strong>{item.title}</strong><small>{item.text}</small></button>)}</div>
            <label>Their name<input value={value.recipient} onChange={(event) => update("recipient", event.target.value)} maxLength={80} placeholder="Someone lovely" /></label>
            <label>From you<input value={value.from} onChange={(event) => update("from", event.target.value)} maxLength={80} placeholder="Your favorite person" /></label>
            <label>Your headline<input value={value.headline} onChange={(event) => update("headline", event.target.value)} maxLength={120} required /></label>
            <label>The note they’ll see first<textarea value={value.message} onChange={(event) => update("message", event.target.value)} maxLength={3000} rows={4} placeholder="Write it like you’d say it. That’s the good stuff." /></label>
            <div className="wish-suggestions">
              <div className="wish-suggestions-heading"><strong>Need a little inspiration?</strong><span>Pick a starting point, then make it yours.</span></div>
              <div className="wish-category-options" role="group" aria-label="Wish suggestion category">
                {wishCategories.map((category) => <button key={category} type="button" className={suggestionCategory === category ? "selected" : ""} onClick={() => setSuggestionCategory(category)} aria-pressed={suggestionCategory === category}>{category}</button>)}
              </div>
              <div className="wish-suggestion-list">
                {wishLibrary.filter((suggestion) => suggestion.category === suggestionCategory).map((suggestion) => (
                  <article key={suggestion.id}>
                    <p>{suggestion.text}</p>
                    <button type="button" onClick={() => update("message", suggestion.text)}>Use this wish</button>
                  </article>
                ))}
              </div>
              <small>These original suggestions stay on this device until you choose one; nothing is saved until you save your page.</small>
            </div>
            <label className="upload-field">{uploading === "cover" ? "Uploading your photo…" : value.image ? "Cover photo added · choose another" : "＋ Add a cover photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!!uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "cover"); }} />
            </label>
            {value.image && <img className="editor-cover-preview" src={value.image} alt="Uploaded cover preview" />}
          </section>

          <section className="form-panel">
            <span className="form-step">03 · THE SURPRISES</span>
            <h2>Leave a little something hidden.</h2>
            <p className="panel-copy">Make each surprise feel unmistakably yours: use a shared memory, an inside joke, or a detail only they would recognize. Quiz answers stay private and are checked on the server.</p>
            <div className="surprise-add-buttons">{(["note", "quote", "question", "memory"] as SurpriseKind[]).map((kind) => <button key={kind} type="button" onClick={() => addBlock(kind)}>＋ {kind === "note" ? "Hidden note" : kind === "quote" ? "Favorite quote" : kind === "question" ? "Question game" : "Memory photo"}</button>)}</div>
            <div className="surprise-editor-list">{value.surprises.map((block, index) => <article className="surprise-editor-card" key={block.id}>
              <div className="surprise-editor-card-top"><span>{String(index + 1).padStart(2, "0")} · {block.kind.toUpperCase()}</span><button type="button" onClick={() => update("surprises", value.surprises.filter((item) => item.id !== block.id))}>Remove</button></div>
              {block.kind === "note" && <><label>Reveal button text<input value={block.title} onChange={(event) => updateBlock(block.id, "title", event.target.value)} maxLength={160} placeholder="Open this when you need our late-night-drive playlist" /></label><label>Hidden message<textarea value={block.body} onChange={(event) => updateBlock(block.id, "body", event.target.value)} maxLength={1500} rows={3} placeholder="A tiny detail from your story together makes this feel like theirs alone." /></label></>}
              {block.kind === "quote" && <><label>Favorite quote<textarea value={block.body} onChange={(event) => updateBlock(block.id, "body", event.target.value)} maxLength={1500} rows={3} placeholder="Your own words or a favorite quote" /></label><label>Who said it? (optional)<input value={block.title} onChange={(event) => updateBlock(block.id, "title", event.target.value)} maxLength={160} /></label></>}
              {block.kind === "question" && <><label>Your question<input value={block.title} onChange={(event) => updateBlock(block.id, "title", event.target.value)} maxLength={160} required /></label><label>Correct answer<input value={block.answer || ""} onChange={(event) => updateBlock(block.id, "answer", event.target.value)} maxLength={160} required /></label><label>Hint (optional)<input value={block.hint || ""} onChange={(event) => updateBlock(block.id, "hint", event.target.value)} maxLength={240} /></label><label>Message when they get it right<textarea value={block.body} onChange={(event) => updateBlock(block.id, "body", event.target.value)} maxLength={1500} rows={2} /></label></>}
              {block.kind === "memory" && <><label>Photo caption<input value={block.title} onChange={(event) => updateBlock(block.id, "title", event.target.value)} maxLength={160} /></label><label className="upload-field">{uploading === block.id ? "Uploading memory…" : block.body ? "Memory photo added · choose another" : "＋ Add a memory photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!!uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, block.id); }} /></label>{block.body && <img className="editor-cover-preview" src={block.body} alt="Memory preview" />}</>}
            </article>)}</div>
          </section>

          <section className="form-panel">
            <span className="form-step">04 · SHARE IT</span>
            <h2>Choose who can open it.</h2>
            <label className="status-choice"><span><strong>Save as a draft</strong><small>Only you can see this page.</small></span><input type="radio" name="status" checked={value.status === "draft"} onChange={() => update("status", "draft")} /></label>
            <label className="status-choice"><span><strong>Publish and share</strong><small>Anyone with the link can open the page.</small></span><input type="radio" name="status" checked={value.status === "published"} onChange={() => update("status", "published")} /></label>
            <label className="status-choice"><span><strong>Require a page code</strong><small>Private page content stays locked until a recipient enters it.</small></span><input type="checkbox" checked={value.isPrivate} onChange={(event) => update("isPrivate", event.target.checked)} /></label>
            {value.isPrivate && <label>Page code {initial?.isPrivate && <span className="input-caption">Leave blank to keep your current code.</span>}<input type="password" autoComplete="new-password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} minLength={8} maxLength={100} placeholder="At least 8 characters" required={value.status === "published" && !initial?.isPrivate} /></label>}
            <p className="security-hint">This code is stored as a password hash. Share the page link and code separately.</p>
          </section>
        </div>

        <aside className={`experience-preview template-${value.template}`} style={{ "--wish-color": value.color, "--wish-wash": theme.wash } as React.CSSProperties}>
          <div className={`experience-preview-stage mood-${value.mood.toLowerCase()}`}>
            <span className="eyebrow">LIVE PREVIEW · {value.template.toUpperCase()}</span>
            <MoodAtmosphere mood={value.mood} />
            <ExperienceTemplate experience={value} slug="" />
          </div>
        </aside>
        <div className="editor-savebar">
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-dark" type="submit" disabled={saving || !!uploading}>{saving ? "Saving to your account…" : value.status === "published" ? "Save & publish page" : "Save as a draft"} <span>↗</span></button>
        </div>
      </form>
    </main>
  );
}
