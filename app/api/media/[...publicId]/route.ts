import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasPageAccess } from "@/lib/page-access";
import { hasSupportGrant, type StoredExperience } from "@/lib/experiences";
import { apiError } from "@/lib/http";
import { getRegisteredVisitor } from "@/lib/visitor-tracking";

/** Serves authenticated Cloudinary media only to its owner or an authorized
 * viewer of a published experience that references that asset. */
export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string[] }> }) {
  const { publicId: segments } = await params;
  const publicId = segments.join("/");
  if (!/^momenique\/[a-f\d]{24}\/[a-f\d-]{36}$/i.test(publicId)) return apiError("Image not found.", 404);

  const db = await getDb();
  const asset = await db.collection("mediaAssets").findOne({ publicId });
  if (!asset) return apiError("Image not found.", 404);

  const session = await getServerSession(authOptions);
  const ownerCanView = session?.user?.id === asset.ownerId.toString();
  const supportAdmin = session?.user?.role === "support_admin" || session?.user?.role === "super_admin";
  if (!ownerCanView) {
    const reference = `/api/media/${encodeURIComponent(publicId)}`;
    const experiences = await db.collection<StoredExperience>("experiences").find({
      status: "published",
      ownerId: asset.ownerId,
      $or: [{ image: reference }, { "surprises.body": reference }],
    }).toArray();
    const canView = await Promise.all(experiences.map(async (experience) => {
      const supportGranted = supportAdmin && await hasSupportGrant(experience._id.toHexString(), session?.user?.id || "");
      if (supportGranted) {
        await db.collection("auditEvents").insertOne({
          actorId: new ObjectId(session!.user.id),
          action: "support_private_media_view",
          targetId: experience._id,
          createdAt: new Date(),
        });
      }
      if (supportGranted) return true;
      const unlocked = !experience.isPrivate
        || await hasPageAccess(experience._id.toHexString(), experience.accessCodeHash);
      return unlocked && Boolean(await getRegisteredVisitor(experience._id.toHexString()));
    },
    ));
    if (!canView.some(Boolean)) return apiError("Image not found.", 404);
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return apiError("Image storage is not configured.", 503);

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const signedUrl = cloudinary.url(publicId, {
    secure: true,
    type: "authenticated",
    sign_url: true,
    resource_type: "image",
    format: asset.format,
  });
  const upstream = await fetch(signedUrl);
  if (!upstream.ok || !upstream.body) {
    console.error("Cloud media delivery failed:", upstream.status, publicId);
    return apiError("The image could not be loaded.", 502);
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
