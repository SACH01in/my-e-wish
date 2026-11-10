import { describe, expect, it } from "vitest";
import { renderBrandedEmail } from "./email-template";

describe("renderBrandedEmail", () => {
  it("uses the my e-Wish email theme and creates a readable text alternative", () => {
    const result = renderBrandedEmail({
      preheader: "Verify your address.",
      title: "A little hello",
      greeting: "Hi Alex,",
      paragraphs: ["Please verify your email."],
      action: { label: "Verify address", url: "https://momenique.example/verify?token=abc" },
      finePrint: "This link expires soon.",
    });

    expect(result.html).toContain("my e-Wish");
    expect(result.html).toContain("#f8f6f1");
    expect(result.html).toContain("#b86f69");
    expect(result.html).toContain("https://momenique.example/verify?token=abc");
    expect(result.text).toContain("Hi Alex,");
    expect(result.text).toContain("Verify address: https://momenique.example/verify?token=abc");
  });

  it("escapes untrusted text and excludes unsafe action URLs", () => {
    const result = renderBrandedEmail({
      preheader: "Message",
      title: "<script>alert(1)</script>",
      message: `<img src=x onerror="alert(1)">`,
      action: { label: "Open", url: "javascript:alert(1)" },
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(result.html).not.toContain("javascript:");
    expect(result.text).not.toContain("javascript:");
  });
});
