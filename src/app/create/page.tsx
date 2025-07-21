import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Box } from "@/components/ui/box";
import CreateSorterForm from "./create-sorter-form";

export default async function CreatePage() {
  // Check authentication on server side
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
      <Box variant="primary" size="md" className="mb-6 block">
        <div>
          <h1 className="text-xl font-bold">Create New Sorter</h1>
        </div>
      </Box>

      <CreateSorterForm />
    </div>
  );
}
