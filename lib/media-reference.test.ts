import { describe, expect, it } from "vitest";
import { mediaReferenceToPublicId } from "./media-reference";

describe("mediaReferenceToPublicId", () => {
  it("decodes a valid uploaded media URL to the stored public ID", () => {
    expect(mediaReferenceToPublicId(
      "/api/media/momenique%2F0123456789abcdef01234567%2Fddf04fea-e83e-41e1-9c38-33beed955f2f",
    )).toBe("momenique/0123456789abcdef01234567/ddf04fea-e83e-41e1-9c38-33beed955f2f");
  });

  it("rejects malformed or unrelated media references", () => {
    expect(mediaReferenceToPublicId("/api/media/%E0%A4%A")).toBeNull();
    expect(mediaReferenceToPublicId("/api/media/other/image")).toBeNull();
  });
});
