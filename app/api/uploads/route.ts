import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { fileTypeFromBuffer } from "file-type";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, getClientAddress, hasSameOrigin } from "@/lib/http";
import { checkAccountRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Stores authenticated Cloudinary assets; only the owner and page recipients
 * can later retrieve media through the guarded media route. */
export async function POST(request: Request) {
  if (!(await hasSameOrigin())) return apiError("Request origin was not accepted.", 403);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return apiError("Please sign in to upload images.", 401);
  if (!(await checkAccountRateLimit("image-upload", session.user.id, getClientAddress(request), 20, 60 * 60 * 1000))) {
    return apiError("Too many image uploads. Try again later.", 429);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_MULTIPART_BYTES) return apiError("The upload request is too large.", 413);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return apiError("Image storage is not configured. Set the Cloudinary server environment variables.", 503);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return apiError("Choose an image to upload.", 400);
  if (file.size < 1 || file.size > MAX_IMAGE_BYTES) return apiError("Images must be smaller than 8 MB.", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !allowedTypes.has(detected.mime)) {
    return apiError("Use a valid JPEG, PNG, WebP, or AVIF image.", 415);
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const publicId = `momenique/${session.user.id}/${randomUUID()}`;
  const uploaded = await new Promise<{ public_id: string; bytes: number; format: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "image", type: "authenticated", format: detected.ext },
      (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error("Cloudinary returned no upload result."));
        else resolve({ public_id: result.public_id, bytes: result.bytes, format: result.format });
      },
    ).end(buffer);
  }).catch((error: unknown) => {
    console.error("Cloud image upload failed:", error);
    return null;
  });

  if (!uploaded) return apiError("The image could not be uploaded. Please try again.", 502);
  const db = await getDb();
  await db.collection("mediaAssets").insertOne({
    ownerId: new ObjectId(session.user.id),
    publicId: uploaded.public_id,
    format: uploaded.format,
    bytes: uploaded.bytes,
    visibility: "authenticated",
    createdAt: new Date(),
  });
  return NextResponse.json({ image: `/api/media/${encodeURIComponent(uploaded.public_id)}` }, { status: 201 });
}
