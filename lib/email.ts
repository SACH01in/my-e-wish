import nodemailer from "momenique-mailer";
import { renderBrandedEmail, type BrandedEmailContent } from "@/lib/email-template";

type EmailMessage = {
  to: string;
  subject: string;
  content: BrandedEmailContent;
  replyTo?: string;
};

/** Returns whether all SMTP settings needed by the app are present. */
export function isEmailConfigured(): boolean {
  const port = Number(process.env.SMTP_PORT);
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASSWORD &&
    process.env.EMAIL_FROM?.trim() &&
    Number.isInteger(port) &&
    port > 0 &&
    port <= 65535
  );
}

/** Sends an HTML email through the configured SMTP server. */
export async function sendEmail({ to, subject, content, replyTo }: EmailMessage): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("SMTP email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.");
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { html, text } = renderBrandedEmail(content);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
}
