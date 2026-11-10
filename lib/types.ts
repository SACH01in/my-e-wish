export type Mood = "Heartfelt" | "Playful" | "Elegant" | "Dreamy" | "Encouraging";

export type Occasion =
  | "Birthday"
  | "Anniversary"
  | "Wedding"
  | "Achievement"
  | "Goal"
  | "Special moment"
  | "Just because"
  | "New beginning"
  | "Something else";

export type TemplateId = "letter" | "postcard" | "keepsake";
export type SurpriseKind = "note" | "quote" | "question" | "memory";

export type SurpriseBlock = {
  id: string;
  kind: SurpriseKind;
  title: string;
  body: string;
  answer?: string;
  hint?: string;
};

export type Wish = {
  id: string;
  occasion: Occasion;
  customOccasion: string;
  mood: Mood;
  template: TemplateId;
  recipient: string;
  from: string;
  headline: string;
  message: string;
  surprises: SurpriseBlock[];
  code: string;
  isPrivate: boolean;
  image: string;
  color: string;
  createdAt: number;
};
