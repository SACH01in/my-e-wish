import { NextResponse } from "next/server";
import { getRecipientExperience } from "@/lib/experiences";

/** Returns the public rendering model, never a private code or quiz answer. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getRecipientExperience(slug);
  if (!result) return NextResponse.json({ error: "This page could not be found." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
