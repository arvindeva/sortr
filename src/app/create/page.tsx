import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import CreateSorterFormTags from "./create-sorter-form-tags";

export default async function CreatePage() {
  // Check authentication on server side
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <PageContainer width="narrow">
      <CreateSorterFormTags />
    </PageContainer>
  );
}
