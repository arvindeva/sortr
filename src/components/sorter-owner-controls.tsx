"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DeleteSorterButton } from "@/components/delete-sorter-button";

interface SorterOwnerControlsProps {
  ownerUserId: string;
  sorterSlug: string;
  sorterTitle: string;
}

export function SorterOwnerControls({
  ownerUserId,
  sorterSlug,
  sorterTitle,
}: SorterOwnerControlsProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const isOwner = Boolean(currentUserId && currentUserId === ownerUserId);

  if (!isOwner) return null;

  return (
    <>
      {/* Edit — icon-only square on mobile, full button on desktop */}
      <Button
        asChild
        variant="neutral"
        size="icon"
        className="shrink-0 sm:hidden"
        title="Edit sorter"
      >
        <Link href={`/sorter/${sorterSlug}/edit`}>
          <Pencil size={18} />
        </Link>
      </Button>
      <Button asChild variant="neutral" className="hidden sm:inline-flex">
        <Link href={`/sorter/${sorterSlug}/edit`}>
          <Pencil className="mr-2" size={16} />
          Edit
        </Link>
      </Button>

      {/* Delete — icon-only on mobile, full button on desktop */}
      <span className="sm:hidden">
        <DeleteSorterButton
          sorterSlug={sorterSlug}
          sorterTitle={sorterTitle}
          iconOnly
        />
      </span>
      <span className="hidden sm:inline-flex">
        <DeleteSorterButton sorterSlug={sorterSlug} sorterTitle={sorterTitle} />
      </span>
    </>
  );
}
