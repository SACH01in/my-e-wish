import { describe, expect, it } from "vitest";
import { wishCategories, wishLibrary } from "@/lib/wish-library";

describe("local wish suggestion library", () => {
  it("provides 60 original suggestions, evenly split across all five categories", () => {
    expect(wishLibrary).toHaveLength(60);
    for (const category of wishCategories) {
      expect(wishLibrary.filter((wish) => wish.category === category)).toHaveLength(12);
    }
  });

  it("keeps suggestion IDs unique and all message text usable", () => {
    expect(new Set(wishLibrary.map((wish) => wish.id)).size).toBe(wishLibrary.length);
    expect(wishLibrary.every((wish) => wish.text.trim().length > 20)).toBe(true);
  });
});
