import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { experienceSchema } from "@/lib/experience-schema";
import { toPublicExperience, type StoredExperience } from "@/lib/experiences";

const page = {
  occasion: "Birthday",
  customOccasion: "",
  mood: "Heartfelt",
  template: "letter",
  recipient: "Alex",
  from: "Sam",
  headline: "A little birthday magic",
  message: "A note from someone who cares.",
  surprises: [],
  isPrivate: false,
  image: "",
  color: "#b86f69",
  status: "published",
} as const;

describe("experience validation", () => {
  it("accepts a valid published page", () => {
    expect(experienceSchema.safeParse(page).success).toBe(true);
  });

  it("requires a name for a custom occasion", () => {
    expect(experienceSchema.safeParse({ ...page, occasion: "Something else" }).success).toBe(false);
  });

  it("rejects arbitrary image URLs instead of an owned media reference", () => {
    expect(experienceSchema.safeParse({ ...page, image: "https://example.invalid/photo.jpg" }).success).toBe(false);
  });

  it("requires an answer on every question game", () => {
    const result = experienceSchema.safeParse({
      ...page,
      surprises: [{ id: "ddf04fea-e83e-41e1-9c38-33beed955f2f", kind: "question", title: "Where?", body: "A message.", answer: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts only validated image references for memory blocks", () => {
    const result = experienceSchema.safeParse({
      ...page,
      surprises: [{
        id: "ddf04fea-e83e-41e1-9c38-33beed955f2f",
        kind: "memory",
        title: "A favorite day",
        body: "/api/media/momenique%2F0123456789abcdef01234567%2Fddf04fea-e83e-41e1-9c38-33beed955f2f",
      }],
    });
    expect(result.success).toBe(true);
  });
});

describe("public experience projection", () => {
  it("does not expose owner IDs, page-code hashes, or quiz answers", () => {
    const stored = {
      _id: new ObjectId(),
      ownerId: new ObjectId(),
      slug: "a-private-share-slug",
      ...page,
      isPrivate: true,
      accessCodeHash: "$2b$12$not-a-real-hash",
      surprises: [{
        id: "ddf04fea-e83e-41e1-9c38-33beed955f2f",
        kind: "question" as const,
        title: "Where?",
        body: "That’s right!",
        answer: "The little cafe",
        hint: "It smelled like coffee.",
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StoredExperience & { _id: ObjectId };

    const publicPage = toPublicExperience(stored);
    expect(publicPage.surprises[0]).not.toHaveProperty("answer");
    expect(publicPage).not.toHaveProperty("ownerId");
    expect(publicPage).not.toHaveProperty("accessCodeHash");
    expect(publicPage.slug).toBe(stored.slug);
  });
});
