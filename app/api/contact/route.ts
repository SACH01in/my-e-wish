import { NextResponse } from "next/server";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { contactSchema } from "@/lib/contact";

export const runtime = "nodejs";

const creatorEmail = process.env.CONTACT_RECIPIENT_EMAIL || "sachinsingh11410129@gmail.com";

/** Sends a visitor's message to the creator without persisting it in the app. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  if (!(await checkRateLimit("contact-ip", getClientAddress(request), 3, 60 * 60 * 1000))) {
    return apiError("Too many messages were sent. Please try again later.", 429);
  }
  if (!isEmailConfigured()) return apiError("The contact form is temporarily unavailable.", 503);

  const parsedBody = await readJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const parsed = contactSchema.safeParse(parsedBody.value);
  if (!parsed.success) return apiError("Enter your name, a valid email address, and a message up to 5,000 characters.", 400);

  if (parsed.data.website) {
    return NextResponse.json({ sent: true, message: "Thanks for reaching out. Your message has been sent." });
  }

  const senderEmail = parsed.data.email.toLowerCase();
  if (!(await checkRateLimit("contact-email", senderEmail, 3, 60 * 60 * 1000))) {
    return apiError("Too many messages were sent from this email. Please try again later.", 429);
  }

  try {
    await sendEmail({
      to: creatorEmail,
      replyTo: senderEmail,
      subject: "New contact message via Momenique",
      content: {
        preheader: `A new note from ${parsed.data.name}.`,
        title: "A new little note",
        paragraphs: ["Someone sent you a message through the Momenique contact page."],
        details: [
          { label: "From", value: parsed.data.name },
          { label: "Email", value: senderEmail },
        ],
        message: parsed.data.message,
        finePrint: "Reply directly to this email to respond to the sender.",
      },
    });
  } catch (error) {
    console.error("Contact message delivery failed:", error instanceof Error ? error.message : "Unknown SMTP error.");
    return apiError("Your message could not be sent right now. Please try again later.", 502);
  }

  return NextResponse.json({ sent: true, message: "Thanks for reaching out. Your message has been sent." });
}
