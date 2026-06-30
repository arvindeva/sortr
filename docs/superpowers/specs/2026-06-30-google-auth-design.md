# Google Auth — implementation spec

**Status:** Planned (brainstormed Jun 30 2026, while away). Execute + test on staging before prod.
**Goal:** Add "Continue with Google" sign-in **alongside** the existing magic-link, to fix the mobile-login leak in the growth flywheel (new mobile users can't reliably complete magic-link because the link opens in the OS default browser, not where they're browsing). Keep magic-link for the privacy-conscious users (the original crowd). See memory `next-google-auth`.

## Decisions (settled)

1. **Both providers.** Add Google; keep `EmailProvider` (magic-link). Offer both on `/auth/signin`.
2. **Auto-link by email** — `allowDangerousEmailAccountLinking: true` on the Google provider. **Verified safe + correct against real data:** the `account` table exists (DrizzleAdapter), but **existing magic-link users have ZERO account rows** (next-auth's Email provider never creates them — it uses `verificationToken` + a direct `user` row). So an existing user signing in with Google is exactly the "user row exists, no account row, match by verified email" case this flag handles. Safe because Google verifies email ownership. Without the flag → confusing `OAuthAccountNotLinked` error (the signin page already renders a message for it, `signin/page.tsx:44`).
3. **New Google users → random username, ignore Google name/photo.** No change to the `createUser` event. Privacy-respecting (no real name leaks into a public profile), consistent with magic-link users, less code. Deliberate per user preference.

## The single most important thing

**The one test that can actually fail — do it on staging with a REAL pre-existing magic-link account:**
> An existing magic-link user (has a `user` row, no `account` row, e.g. the dev's own account) clicks "Continue with Google" with the **same email** → must land on their **existing** account with their sorters intact, NOT a new duplicate account, NOT an `OAuthAccountNotLinked` error.

This is the headline acceptance test. The `allowDangerousEmailAccountLinking` behavior with `strategy: "jwt"` + email-provider-only history is version-dependent in next-auth; it *should* work via email match, but it is invisible until a real existing user tries it. Everything else (new signup, magic-link still works) is low-risk.

## Part 1 — Google Cloud Console setup (manual, no code)

1. Google Cloud Console → create/select a project (e.g. "sortr").
2. **OAuth consent screen:** External; app name "sortr", support email, your domain; scopes = just `email`, `profile`, `openid` (the defaults — do NOT request more). Add yourself as a test user while in "Testing", then **Publish** to production when ready (Google may require a few fields; for `email`/`profile` scopes no verification review is needed).
3. **Credentials → Create OAuth client ID → Web application.**
4. **Authorized redirect URIs** — add ALL of these (the classic gotcha — a mismatch = `redirect_uri_mismatch` error):
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<staging-domain>/api/auth/callback/google` (staging — use the real staging URL)
   - `https://sortr.io/api/auth/callback/google` (prod)
   - (If `www.sortr.io` is ever used, add it too — but canonical is non-www.)
5. **Authorized JavaScript origins:** `http://localhost:3000`, the staging origin, `https://sortr.io`.
6. Copy the **Client ID** and **Client Secret**.

## Part 2 — Env vars

Add to local `.env`, staging, AND prod (Railway):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
(Same client can serve all three since all redirect URIs are registered. Or use a separate OAuth client per environment if you prefer isolation — optional.)

## Part 3 — Code change 1: add the provider (`src/lib/auth.ts`)

```ts
import GoogleProvider from "next-auth/providers/google";
// ...
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true, // link Google → existing user by verified email
  }),
  EmailProvider({
    server: process.env.EMAIL_SERVER!,
    from: process.env.EMAIL_FROM!,
  }),
],
```
- No change to `session`, `callbacks`, or the `createUser` event. The JWT `jwt`/`session` callbacks already set `token.sub`/`session.user.id` and work for any provider.
- `createUser` still runs for genuinely-new users (Google or magic-link) → random username. For an *existing* user being linked, `createUser` does NOT fire (they're not new) → no duplicate username. Confirm during the test.

## Part 4 — Code change 2: the sign-in UI (`src/app/auth/signin/page.tsx`)

Add a "Continue with Google" button **above** the email form, inside the card (line ~92, before `<Form>`), with an "or" divider between them. It's already a client component importing `signIn`.

```tsx
<Button
  type="button"
  variant="neutral"
  size="lg"
  className="w-full"
  onClick={() => signIn("google", { callbackUrl: "/" })}
>
  {/* Google "G" icon */}
  Continue with Google
</Button>
{/* "or" divider */}
<div className="my-4 flex items-center gap-3 ...">
  <span className="h-px flex-1 bg-border" /><span className="font-mono text-xs ...">or</span><span className="h-px flex-1 bg-border" />
</div>
{/* existing email form unchanged */}
```
- Add a Google "G" mark (small inline SVG or a lucide/brand icon — there's no brand icon in lucide, so a tiny inline SVG of the 4-color G is the clean choice).
- Update the subtitle copy (line 80-83): currently "We'll email you a magic link — no password." → broaden to mention both, e.g. "Continue with Google, or get a magic link by email — no password."
- The footer "no account? entering your email makes one." still holds; maybe broaden to "signing in makes one."
- Keep the `OAuthAccountNotLinked` error message (already there) — it'd only show if the flag somehow doesn't link (a useful safety net during testing).

## Part 5 — Test plan (staging, before prod)

Run ALL on staging:
1. **🔴 Existing magic-link user → Google (same email)** → lands on existing account, sorters intact, no duplicate. *(The headline test — see above.)*
2. **New user → Google** (a Google email never seen before) → new account created, gets a random username, lands logged in.
3. **Magic-link still works** → email sign-in unaffected.
4. **New user → magic-link, then later → Google (same email)** → links to the same account.
5. **Mobile** → the whole point: on a phone, "Continue with Google" completes in one browser (no email round-trip, no cross-browser issue). Confirm it logs you in *in the browser you started in*.
6. **Cross-check:** after Google sign-in, `getServerSession(authOptions)` works (create a sorter, etc.) — the auth-fix from earlier covers this, but verify the JWT carries `user.id` for Google sessions too.

## Rollback
Trivial: remove the `GoogleProvider` block + the button. No schema/data migration (the `account` table already exists; Google just starts writing rows to it). Existing magic-link users are unaffected.

## Bundled quick-win (optional, can ship together or separately)
**Magenta share + download buttons** on the result page (`src/components/share-button.tsx` area) — currently not magenta; make them pop at the completion moment (where users are funneled and the share loop propagates). Tiny CSS change, unrelated to auth, safe to bundle or do standalone. See memory `next-google-auth`.

## Version note
next-auth **v4.24.11**, `@auth/drizzle-adapter`. `allowDangerousEmailAccountLinking` is supported in v4 and the import `next-auth/providers/google` is verified present. v4's account-linking is reasonably mature, so test #1 is *expected* to pass — but still must be confirmed on staging (it's the invisible-until-tried path).

## What we'll only know at implementation time
The exact `allowDangerousEmailAccountLinking` behavior with this JWT + email-only-history setup — confirmed only by test #1 on staging. If it does NOT auto-link (creates a duplicate or errors), fallbacks: (a) check next-auth version + upgrade if a known fix exists, (b) add a custom `signIn` callback that looks up the existing user by email and links manually, (c) worst case, a one-time `account`-backfill is NOT needed since linking happens at sign-in. Decide based on what the test shows.
