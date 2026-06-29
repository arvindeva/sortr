import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import CreateSorterFormTags from "./create-sorter-form-tags";

export default async function CreatePage() {
  // Check authentication on server side. authOptions is REQUIRED with the JWT
  // session strategy — without it getServerSession can't read the JWT cookie
  // and returns null even for logged-in users (→ wrongly redirects to signin).
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <PageContainer width="narrow">
      <CreateSorterFormTags />
    </PageContainer>
  );
}
