import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sorters, sorterItems, sorterTags, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import EditSorterForm from "./edit-sorter-form";

interface EditSorterPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditSorterPage({ params }: EditSorterPageProps) {
  const { slug } = await params;
  
  // Check authentication
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  // Get current user
  const userData = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, session.user.email))
    .limit(1);

  if (userData.length === 0) {
    redirect("/auth/signin");
  }

  const currentUserId = userData[0].id;

  // Get sorter and verify ownership
  const sorterData = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      description: sorters.description,
      category: sorters.category,
      slug: sorters.slug,
      coverImageUrl: sorters.coverImageUrl,
      userId: sorters.userId,
    })
    .from(sorters)
    .where(and(eq(sorters.slug, slug), eq(sorters.deleted, false)))
    .limit(1);

  if (sorterData.length === 0) {
    redirect("/404");
  }

  const sorter = sorterData[0];

  // Check ownership
  if (sorter.userId !== currentUserId) {
    redirect(`/sorter/${slug}`); // Redirect back to sorter page
  }

  // Get current tags
  const tags = await db
    .select({
      id: sorterTags.id,
      name: sorterTags.name,
      slug: sorterTags.slug,
      sortOrder: sorterTags.sortOrder,
    })
    .from(sorterTags)
    .where(eq(sorterTags.sorterId, sorter.id))
    .orderBy(sorterTags.sortOrder);

  // Get current items
  const items = await db
    .select({
      id: sorterItems.id,
      title: sorterItems.title,
      imageUrl: sorterItems.imageUrl,
      tagSlugs: sorterItems.tagSlugs,
    })
    .from(sorterItems)
    .where(eq(sorterItems.sorterId, sorter.id));

  return (
    <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
      <EditSorterForm
        sorter={sorter}
        tags={tags}
        items={items}
      />
    </div>
  );
}