"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteAccountProps {
  /** Live counts shown in the dialog so the consequences are concrete. */
  sorterCount: number;
  rankingCount: number;
}

/**
 * The Settings danger zone: self-serve account deletion with a
 * type-"delete"-to-confirm dialog. On success, signs out (the JWT session
 * would otherwise outlive the deleted user row) and lands on the homepage.
 */
export function DeleteAccount({ sorterCount, rankingCount }: DeleteAccountProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmText.trim().toLowerCase() === "delete";

  const handleDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account");
      }
      // Session user no longer exists — sign out fully and go home.
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setDeleting(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Permanently delete your account, your sorters, and your sign-in.
          This cannot be undone.
        </p>
        <Button
          variant="neutral"
          className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => {
            setConfirmText("");
            setOpen(true);
          }}
        >
          Delete account
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[28px] text-foreground">
              Delete your account?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This permanently deletes:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>your profile and sign-in</li>
                  {sorterCount > 0 && (
                    <li>
                      your {sorterCount} sorter{sorterCount === 1 ? "" : "s"}{" "}
                      — people who play {sorterCount === 1 ? "it" : "them"}{" "}
                      lose {sorterCount === 1 ? "it" : "them"} too
                    </li>
                  )}
                </ul>
                <p>
                  {rankingCount > 0 &&
                    `Your ${rankingCount} completed ranking${
                      rankingCount === 1 ? "" : "s"
                    } remain, anonymized. `}
                  This cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="delete-confirm"
              className="hud text-xs text-muted-foreground"
            >
              type &ldquo;delete&rdquo; to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              autoComplete="off"
              disabled={deleting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="neutral"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="border-destructive bg-destructive text-destructive-foreground hover:brightness-110"
              style={{ backgroundImage: "none" }}
              onClick={handleDelete}
              disabled={!confirmed || deleting}
            >
              {deleting ? "Deleting..." : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
