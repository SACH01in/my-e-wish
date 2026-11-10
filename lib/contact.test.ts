import { describe, expect, it } from "vitest";
import { contactSchema, escapeEmailHtml } from "./contact";

describe("contact message validation", () => {
  it("accepts valid details and trims surrounding whitespace", () => {
    const result = contactSchema.safeParse({
      name: "  Alex Example  ",
      email: "  alex@example.org ",
      message: "  Hello from Momenique.  ",
      website: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alex Example");
      expect(result.data.email).toBe("alex@example.org");
      expect(result.data.message).toBe("Hello from Momenique.");
    }
  });

  it("rejects malformed addresses, empty messages, and oversized input", () => {
    expect(contactSchema.safeParse({ name: "Alex", email: "nope", message: "Hello" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Alex", email: "alex@example.org", message: " " }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Alex", email: "alex@example.org", message: "x".repeat(5001) }).success).toBe(false);
  });

  it("escapes untrusted email content before HTML formatting", () => {
    expect(escapeEmailHtml(`<script>alert("x")</script> & 'hi'`))
      .toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;hi&#39;");
  });
});
