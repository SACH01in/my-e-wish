import { z } from "zod";

const moods = ["Heartfelt", "Playful", "Elegant", "Dreamy", "Encouraging"] as const;
const occasions = ["Birthday", "Anniversary", "Wedding", "Achievement", "Goal", "Special moment", "Just because", "New beginning", "Something else"] as const;
const templates = ["letter", "postcard", "keepsake"] as const;
const surpriseKinds = ["note", "quote", "question", "memory"] as const;
const safeMediaReference = z.string().regex(/^\/api\/media\/momenique%2F[a-f\d]{24}%2F[a-f\d-]{36}$/i).or(z.literal(""));

export const surpriseSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(surpriseKinds),
  title: z.string().max(160),
  body: z.string().max(1500),
  answer: z.string().max(160).optional(),
  hint: z.string().max(240).optional(),
}).strict();

export const experienceSchema = z.object({
  occasion: z.enum(occasions),
  customOccasion: z.string().max(60).default(""),
  mood: z.enum(moods),
  template: z.enum(templates),
  recipient: z.string().max(80).default(""),
  from: z.string().max(80).default(""),
  headline: z.string().trim().min(1).max(120),
  message: z.string().max(3000).default(""),
  surprises: z.array(surpriseSchema).max(12),
  isPrivate: z.boolean(),
  accessCode: z.string().max(100).optional(),
  image: safeMediaReference.default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  status: z.enum(["draft", "published"]),
}).strict().superRefine((value, context) => {
  if (value.occasion === "Something else" && !value.customOccasion.trim()) {
    context.addIssue({ code: "custom", path: ["customOccasion"], message: "Add a name for this occasion." });
  }
  for (const [index, block] of value.surprises.entries()) {
    if (block.kind === "question" && !block.answer?.trim()) {
      context.addIssue({ code: "custom", path: ["surprises", index, "answer"], message: "Question games need an answer." });
    }
    if (block.kind === "memory" && block.body && !safeMediaReference.safeParse(block.body).success) {
      context.addIssue({ code: "custom", path: ["surprises", index, "body"], message: "Memory images must use an uploaded media reference." });
    }
  }
});

export const registrationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
}).strict();
