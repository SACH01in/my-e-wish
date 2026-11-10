import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ExperienceEditor from "@/app/components/ExperienceEditor";

export const metadata = { robots: { index: false, follow: false } };

export default async function CreateExperiencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/create");
  return <ExperienceEditor initialSender={session.user.name || ""} />;
}
