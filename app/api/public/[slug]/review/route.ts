import { MongoServerError, ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { apiError, getClientAddress, hasSameOrigin, readJsonBody } from "@/lib/http";
import { hasPageAccess } from "@/lib/page-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-config";
import { getRegisteredVisitor } from "@/lib/visitor-tracking";
import type { StoredExperience } from "@/lib/experiences";

type ExperienceReview = {
  experienceId: ObjectId;
  visitorHash: string;
  visitorName: string;
  message: string;
  createdAt: Date;
  notificationStatus: "pending" | "sending" | "sent";
  notificationStartedAt?: Date;
  notifiedAt?: Date;
};

/** Saves one comment per registered visitor/page and emails the page creator. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const parsedBody = await readJsonBody(request, 3 * 1024);
  if (!parsedBody.ok) return apiError(parsedBody.message, parsedBody.status);
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || !("message" in body) || typeof body.message !== "string") {
    return apiError("Write a short note before sending.", 400);
  }
  const message = body.message.trim();
  if (message.length < 2 || message.length > 1500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    return apiError("Your note must be between 2 and 1,500 characters.", 400);
  }

  const { slug } = await params;
  const db = await getDb();
  const experience = await db.collection<StoredExperience>("experiences").findOne({ slug, status: "published" });
  if (!experience) return apiError("This page could not be found.", 404);

  const session = await getServerSession(authOptions);
  if (session?.user?.id === experience.ownerId.toHexString()) {
    return apiError("Creators cannot leave visitor reviews on their own pages.", 403);
  }
  const visitor = await getRegisteredVisitor(experience._id.toHexString());
  if (!visitor) return apiError("Enter your name before leaving a note.", 403);
  if (experience.isPrivate && !(await hasPageAccess(experience._id.toHexString(), experience.accessCodeHash))) {
    return apiError("Unlock this page before leaving a note.", 403);
  }

  const pageId = experience._id.toHexString();
  if (!(await checkRateLimit("experience-review-page", pageId, 500, 60 * 60 * 1000))) {
    return apiError("This page has had too many comments. Try again later.", 429);
  }
  if (!(await checkRateLimit("experience-review-address", `${pageId}:${getClientAddress(request)}`, 6, 60 * 60 * 1000))) {
    return apiError("Too many comments were sent. Please try again later.", 429);
  }

  const reviews = db.collection<ExperienceReview>("experienceReviews");
  let review: ExperienceReview | null = await reviews.findOne({ experienceId: experience._id, visitorHash: visitor.visitorHash });
  if (!review) {
    const newReview: ExperienceReview = {
      experienceId: experience._id,
      visitorHash: visitor.visitorHash,
      visitorName: visitor.visitorName,
      message,
      createdAt: new Date(),
      notificationStatus: "pending",
    };
    try {
      await reviews.insertOne(newReview);
      review = await reviews.findOne({ experienceId: experience._id, visitorHash: visitor.visitorHash });
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      review = await reviews.findOne({ experienceId: experience._id, visitorHash: visitor.visitorHash });
      if (!review) throw error;
    }
  }

  if (!review) throw new Error("The visitor note could not be loaded after saving.");
  if (review.notificationStatus === "sent") {
    return NextResponse.json({ saved: true, notificationSent: true, alreadySubmitted: true });
  }

  const claimAt = new Date();
  const staleSendingAt = new Date(claimAt.getTime() - 5 * 60 * 1000);
  const claim = await reviews.updateOne(
    {
      experienceId: experience._id,
      visitorHash: visitor.visitorHash,
      $or: [
        { notificationStatus: "pending" },
        { notificationStatus: "sending", notificationStartedAt: { $lt: staleSendingAt } },
      ],
    },
    { $set: { notificationStatus: "sending", notificationStartedAt: claimAt } },
  );
  if (!claim.modifiedCount) {
    const current = await reviews.findOne({ experienceId: experience._id, visitorHash: visitor.visitorHash });
    if (current?.notificationStatus === "sent") {
      return NextResponse.json({ saved: true, notificationSent: true, alreadySubmitted: true });
    }
    return NextResponse.json({
      saved: true,
      notificationSent: false,
      message: "Your note is saved and its email notification is being sent.",
    });
  }

  let creator: { email?: string; name?: string } | null = null;
  if (isEmailConfigured()) {
    creator = await db.collection<{ email: string; name?: string }>("users").findOne(
      { _id: experience.ownerId },
      { projection: { email: 1, name: 1 } },
    );
  }
  if (!creator?.email) {
    await reviews.updateOne(
      { experienceId: experience._id, visitorHash: visitor.visitorHash, notificationStatus: "sending" },
      { $set: { notificationStatus: "pending" }, $unset: { notificationStartedAt: "" } },
    );
    return NextResponse.json({
      saved: true,
      notificationSent: false,
      message: "Your note is saved, but the creator’s email notification is not configured.",
    });
  }

  try {
    const occasion = experience.customOccasion || experience.occasion;
    await sendEmail({
      to: creator.email,
      subject: `A note from ${review.visitorName} about your wish`,
      content: {
        preheader: `${review.visitorName} left a note on your my e-Wish page.`,
        title: "Someone left you a little note",
        greeting: creator.name ? `Hello ${creator.name},` : undefined,
        paragraphs: [`${review.visitorName} shared how your wish made them feel.`],
        details: [
          { label: "Visitor", value: review.visitorName },
          { label: "Your page", value: `${experience.recipient || "Your wish"} · ${occasion}` },
        ],
        message: review.message,
        action: { label: "See visitors and notes", url: `${SITE_URL}/profile#page-${pageId}` },
        finePrint: "Visitor names are self-reported. Replying to this email will not contact the visitor.",
      },
    });
    await reviews.updateOne(
      { experienceId: experience._id, visitorHash: visitor.visitorHash, notificationStatus: "sending" },
      { $set: { notificationStatus: "sent", notifiedAt: new Date() }, $unset: { notificationStartedAt: "" } },
    );
    return NextResponse.json({ saved: true, notificationSent: true });
  } catch (error) {
    console.error("Experience review notification failed:", error instanceof Error ? error.message : "Unknown SMTP error.");
    await reviews.updateOne(
      { experienceId: experience._id, visitorHash: visitor.visitorHash, notificationStatus: "sending" },
      { $set: { notificationStatus: "pending" }, $unset: { notificationStartedAt: "" } },
    );
    return NextResponse.json({
      saved: true,
      notificationSent: false,
      message: "Your note is saved, but the creator’s email could not be sent right now.",
    });
  }
}
