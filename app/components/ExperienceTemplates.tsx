import type { Mood, Occasion, SurpriseBlock, TemplateId } from "@/lib/types";
import OccasionSignature from "@/app/components/OccasionSignature";
import SurpriseBlocks from "@/app/components/SurpriseBlocks";

export type RecipientStory = {
  occasion: Occasion;
  customOccasion: string;
  mood: Mood;
  template: TemplateId;
  recipient: string;
  from: string;
  headline: string;
  message: string;
  surprises: Array<SurpriseBlock>;
  image: string;
};

type StoryProps = { experience: RecipientStory; slug: string };

function StoryCopy({ experience, slug, postcard = false }: {
  experience: RecipientStory;
  slug: string;
  postcard?: boolean;
}) {
  return (
    <div className="public-story-copy">
      <span className="public-ornament" aria-hidden="true">{moodOrnament[experience.mood]}</span>
      <h1>{experience.recipient ? `${experience.recipient}, ` : ""}<em>{experience.headline}</em></h1>
      {experience.message && <p className="public-message">{experience.message}</p>}
      {experience.from && <p className="public-from">WITH LOVE, <span>{experience.from} ♡</span></p>}
      <div className="public-divider"><span>✦</span></div>
      <SurpriseBlocks blocks={experience.surprises} slug={slug} />
      {postcard && <p className="postcard-signature">A little hello, sent with love.</p>}
    </div>
  );
}

const moodOrnament: Record<Mood, string> = {
  Heartfelt: "♡",
  Playful: "✳",
  Elegant: "❧",
  Dreamy: "☾",
  Encouraging: "☼",
};

function OccasionHeading({ experience }: { experience: RecipientStory }) {
  return (
    <header className="public-story-heading">
      <span className="public-kicker">{experience.mood} · A NOTE FOR YOU</span>
      <OccasionSignature occasion={experience.occasion} customOccasion={experience.customOccasion} />
    </header>
  );
}

function CoverImage({ experience, className = "" }: { experience: RecipientStory; className?: string }) {
  return experience.image
    ? <img className={`public-cover ${className}`} src={experience.image} alt="" />
    : <div className={`public-cover-placeholder placeholder-${experience.mood.toLowerCase()}`} aria-hidden="true">
        <span>{moodOrnament[experience.mood]}</span>
        <small>{experience.customOccasion || experience.occasion}</small>
      </div>;
}

function LetterTemplate({ experience, slug }: StoryProps) {
  return (
    <article className="public-story template-letter">
      <OccasionHeading experience={experience} />
      <CoverImage experience={experience} />
      <StoryCopy experience={experience} slug={slug} />
    </article>
  );
}

function PostcardTemplate({ experience, slug }: StoryProps) {
  return (
    <article className="public-story template-postcard">
      <OccasionHeading experience={experience} />
      <div className="postcard-photo-side"><CoverImage experience={experience} /><span className="postcard-photo-stamp" aria-hidden="true">{moodOrnament[experience.mood]}</span></div>
      <StoryCopy experience={experience} slug={slug} postcard />
    </article>
  );
}

function KeepsakeTemplate({ experience, slug }: StoryProps) {
  return (
    <article className="public-story template-keepsake">
      <div className="keepsake-inner">
        <OccasionHeading experience={experience} />
        <div className="keepsake-content">
          <CoverImage experience={experience} />
          <StoryCopy experience={experience} slug={slug} />
        </div>
        <span className="keepsake-seal" aria-hidden="true">{moodOrnament[experience.mood]}</span>
      </div>
    </article>
  );
}

export default function ExperienceTemplate({ experience, slug }: StoryProps) {
  if (experience.template === "postcard") return <PostcardTemplate experience={experience} slug={slug} />;
  if (experience.template === "keepsake") return <KeepsakeTemplate experience={experience} slug={slug} />;
  return <LetterTemplate experience={experience} slug={slug} />;
}
