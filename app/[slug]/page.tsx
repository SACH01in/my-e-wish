import { notFound } from "next/navigation";
import PublicExperience from "@/app/components/PublicExperience";
import { getRecipientExperience } from "@/lib/experiences";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** Loads published pages on the server so locked private content is never sent. */
export default async function SharedExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getRecipientExperience(slug);
  if (!result) notFound();

  return (
    <PublicExperience
      slug={slug}
      recipient={result.recipient}
      initialExperience={result.experience}
      needsVisitorName={result.needsVisitorName}
    />
  );
}
