const mediaPublicIdPattern = /^momenique\/[a-f\d]{24}\/[a-f\d-]{36}$/i;
const mediaReferencePrefix = "/api/media/";

/** Converts an encoded app media URL to its stored Cloudinary public ID. */
export function mediaReferenceToPublicId(reference: string): string | null {
  if (!reference.startsWith(mediaReferencePrefix)) return null;

  try {
    const publicId = decodeURIComponent(reference.slice(mediaReferencePrefix.length));
    return mediaPublicIdPattern.test(publicId) ? publicId : null;
  } catch {
    return null;
  }
}
