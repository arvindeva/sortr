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
      <Button asChild variant="neutral">
        <Link href={`/sorter/${sorterSlug}/edit`}>
          <Pencil className="mr-2" size={16} />
          Edit
        </Link>
      </Button>
      <DeleteSorterButton sorterSlug={sorterSlug} sorterTitle={sorterTitle} />
    </>
  );
}
