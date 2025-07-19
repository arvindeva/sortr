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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Box variant="primary" size="xl" className="mb-8 block">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Create New Sorter</h1>
          <p className="text-lg font-medium">
            Create a new sorter for others to rank and compare items.
          </p>
        </div>
      </Box>

      <CreateSorterForm />
    </div>
  );
}
