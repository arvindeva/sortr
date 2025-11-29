"use client";

import { useSession } from "next-auth/react";
import { DeleteRankingButton } from "@/components/delete-ranking-button";

interface RankingOwnerActionsProps {
  ownerUserId: string | null;
  rankingId: string;
  sorterTitle: string;
  hideTextOnMobile?: boolean;
}

export function RankingOwnerActions({
  ownerUserId,
  rankingId,
  sorterTitle,
  hideTextOnMobile = false,
}: RankingOwnerActionsProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const isOwner = Boolean(ownerUserId && currentUserId === ownerUserId);

  if (!isOwner) return null;

  return (
    <DeleteRankingButton
      rankingId={rankingId}
      sorterTitle={sorterTitle}
      hideTextOnMobile={hideTextOnMobile}
    />
  );
}
