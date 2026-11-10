import { afterEach, describe, expect, it, vi } from "vitest";
import { isEmailConfigured, sendEmail } from "./email";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email configuration", () => {
  it("requires complete SMTP settings and a valid port", () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "test-password");
    vi.stubEnv("EMAIL_FROM", "my e-Wish <hello@example.com>");

    expect(isEmailConfigured()).toBe(true);

    vi.stubEnv("SMTP_PORT", "not-a-port");
    expect(isEmailConfigured()).toBe(false);
  });

  it("fails explicitly when SMTP settings are missing", async () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASSWORD", "");
    vi.stubEnv("EMAIL_FROM", "");

    await expect(sendEmail({
      to: "person@example.com",
      subject: "Test",
      content: { preheader: "Test", title: "Test" },
    })).rejects.toThrow("SMTP email is not configured");
  });
});
