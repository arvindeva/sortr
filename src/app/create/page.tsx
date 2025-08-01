import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Box } from "@/components/ui/box";
import { PageHeader } from "@/components/ui/page-header";
import CreateSorterFormTags from "./create-sorter-form-tags";

export default async function CreatePage() {
  // Check authentication on server side
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
      <CreateSorterFormTags />
    </div>
  );
}
