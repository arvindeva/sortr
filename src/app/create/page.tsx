import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CreateSorterForm from "./create-sorter-form";

export default async function CreatePage() {
  // Check authentication on server side
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create New Sorter</h1>
        <p className="text-muted-foreground">
          Create a new sorter for others to rank and compare items.
        </p>
      </div>

      <CreateSorterForm />
    </div>
  );
}
