import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { account, sorters, sortingResults, user } from "@/db/schema";
import { ArcadePageHeader } from "@/components/ui/arcade-page-header";
import { PageContainer } from "@/components/ui/page-container";
import { AvatarManager } from "@/components/avatar-manager";
import { EditUsernameButton } from "@/components/edit-username-button";
import { DeleteAccount } from "@/components/delete-account";

/**
 * Account settings. Grew out of two feedback threads: "how do I change my
 * pfp" (the profile's inline editor wasn't discoverable) and account-deletion
 * emails to privacy@ (now self-serve in the danger zone).
 */
export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const [[userRow], providers, [sorterCount], [rankingCount]] =
    await Promise.all([
      db
        .select({
          username: user.username,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, userId)),
      db
        .select({ provider: account.provider })
        .from(account)
        .where(eq(account.userId, userId)),
      db
        .select({ c: count() })
        .from(sorters)
        .where(
          and(
            eq(sorters.userId, userId),
            eq(sorters.deleted, false),
            eq(sorters.status, "active"),
          ),
        ),
      db
        .select({ c: count() })
        .from(sortingResults)
        .where(eq(sortingResults.userId, userId)),
    ]);

  if (!userRow) {
    redirect("/auth/signin");
  }

  const username = userRow.username ?? "";
  const initial = username.charAt(0).toUpperCase() || "?";
  const signInMethods = [
    ...providers.map((p) =>
      p.provider === "google" ? "Google" : p.provider,
    ),
    "magic link",
  ].join(" · ");

  return (
    <PageContainer className="max-w-3xl">
      <ArcadePageHeader className="mb-8" title="Settings" />

      <div className="space-y-6">
        {/* Profile */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-7">
          <div className="hud mb-5 text-xs text-muted-foreground">Profile</div>
          <div className="flex items-center gap-5">
            <div className="relative w-fit shrink-0">
              <div
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl"
                style={{
                  background: "linear-gradient(135deg,#ff2e7e,#9b6bff)",
                }}
              >
                {userRow.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userRow.image}
                    alt="Your avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="display text-4xl font-black"
                    style={{ color: "rgba(0,0,0,.72)" }}
                  >
                    {initial}
                  </span>
                )}
              </div>
              <div className="absolute -right-1 -bottom-1">
                <AvatarManager currentImage={userRow.image} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="display truncate text-2xl font-black text-foreground">
                  {username}
                </span>
                <EditUsernameButton currentUsername={username} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your public name and avatar, shown on your profile and
                rankings.
              </p>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="rounded-2xl border border-border bg-card p-6 md:p-7">
          <div className="hud mb-5 text-xs text-muted-foreground">Account</div>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground">{userRow.email}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-muted-foreground">Sign-in methods</dt>
              <dd className="font-medium text-foreground">{signInMethods}</dd>
            </div>
          </dl>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-destructive/40 bg-card p-6 md:p-7">
          <div className="hud mb-5 text-xs text-destructive">Danger zone</div>
          <DeleteAccount
            sorterCount={sorterCount?.c ?? 0}
            rankingCount={rankingCount?.c ?? 0}
          />
        </section>
      </div>
    </PageContainer>
  );
}
