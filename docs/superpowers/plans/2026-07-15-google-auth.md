# Google Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" alongside the existing magic-link sign-in, auto-linking existing magic-link users by verified email.

**Architecture:** next-auth v4.24.11 + DrizzleAdapter + JWT sessions. One new provider block in `src/lib/auth.ts` (with `allowDangerousEmailAccountLinking: true`), one new button + divider in `src/app/auth/signin/page.tsx`. No schema changes — the `account` table already exists and is empty for magic-link users; Google simply starts writing rows to it at sign-in.

**Tech Stack:** next-auth v4, `next-auth/providers/google`, existing Button/Form UI.

**Spec:** `docs/superpowers/specs/2026-06-30-google-auth-design.md` (settled decisions: both providers; auto-link by email; new Google users get random usernames, Google name/photo ignored — `createUser` unchanged).

## Global Constraints

- Secrets: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are already set in local `.env`, staging Railway, and prod Railway. NEVER print their values in chat, commits, or logs.
- The OAuth client's redirect URIs are registered for localhost:3000, sortr-staging.up.railway.app, and sortr.io. The consent screen is in **Testing** mode — only listed Test users can sign in until it's published. Publish (instant, no review at these scopes) happens in Task 4, before prod exposure.
- The headline acceptance test (staging, MUST pass before prod): existing magic-link user `arvindeva@gmail.com` (staging user id `2311b2d2-4340-473c-9a31-5219db664a38`, username `Rveena`, 0 `account` rows, 28 sorters) signs in with Google → lands on the EXISTING account, sorters intact, no duplicate user, no `OAuthAccountNotLinked` error.
- Local dev's `DATABASE_URL` points at the STAGING database — a local Google sign-in exercises the same DB the staging test uses. That's expected and useful (pre-flight), but the test also runs on the deployed staging site to validate Railway env config.
- Do not change `session`, `callbacks`, or the `createUser` event. Magic-link (EmailProvider) stays.

---

### Task 1: Add the Google provider (`src/lib/auth.ts`)

**Files:**
- Modify: `src/lib/auth.ts:1` (import), `:10-15` (providers array)

**Interfaces:**
- Produces: `authOptions.providers` = [Google, Email]. Google listed first (mirrors the UI order).

- [ ] **Step 1: Add the import** (top of file, alongside the EmailProvider import)

```ts
import GoogleProvider from "next-auth/providers/google";
```

- [ ] **Step 2: Add the provider block** — replace the providers array:

Old:
```ts
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
```

New:
```ts
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Link a Google sign-in to an existing user row by verified email.
      // Safe here: Google verifies email ownership, and our magic-link users
      // have no account rows to conflict with (Email provider never made any).
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
```

- [ ] **Step 3: Verify and build**

```bash
grep -n "GoogleProvider\|allowDangerousEmailAccountLinking" src/lib/auth.ts
npm run build
```
Expected: both lines present; "Compiled successfully" (sitemap DB flake ignorable).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "Add Google OAuth provider with email account linking"
```

---

### Task 2: Sign-in page UI (`src/app/auth/signin/page.tsx`)

**Files:**
- Modify: `src/app/auth/signin/page.tsx` (~line 80-84 subtitle copy; ~line 92 inside the card, before `<Form>`; ~line 139-140 footer copy)

**Interfaces:**
- Consumes: `signIn` from `next-auth/react` (already imported at line 2).

- [ ] **Step 1: Add the Google button + divider** inside the card `<div className="rounded-2xl border border-border bg-card p-6">`, BEFORE `<Form {...form}>`:

```tsx
          <Button
            type="button"
            variant="neutral"
            size="lg"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="hud text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
```

- [ ] **Step 2: Broaden the subtitle copy** (~line 80-83):

Old: `Save your rankings, create sorters, and build a profile. We&apos;ll email you a magic link &mdash; no password.`
New: `Save your rankings, create sorters, and build a profile. Continue with Google, or get a magic link by email &mdash; no password.`

- [ ] **Step 3: Broaden the footer copy** (~line 140):

Old: `no account? entering your email makes one.{" "}`
New: `no account? signing in makes one.{" "}`

- [ ] **Step 4: Verify render + build**

```bash
npm run build
curl -s http://localhost:3000/auth/signin | grep -c "Continue with Google"
```
Expected: build clean; count ≥ 1 (dev server must be running).

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/signin/page.tsx
git commit -m "Sign-in page: Continue with Google button + copy updates"
```

---

### Task 3: Local pre-flight of the headline linking test (interactive — needs the human)

Local dev uses the STAGING database, so this pre-runs the real test before deploying.

- [ ] **Step 1 (human):** On `http://localhost:3000/auth/signin`, click "Continue with Google", sign in as `arvindeva@gmail.com` (must be listed as a Test user). Expect: consent screen → redirected back logged in.
- [ ] **Step 2: Verify the DB linked (did NOT duplicate):**

```bash
DBURL=$(grep -h '^DATABASE_URL' .env | cut -d= -f2-)
psql "$DBURL" -c "select count(*) as user_rows from \"user\" where email = 'arvindeva@gmail.com';"
psql "$DBURL" -c "select a.provider, a.type, u.username from account a join \"user\" u on u.id = a.\"userId\" where u.email = 'arvindeva@gmail.com';"
psql "$DBURL" -c "select count(*) as sorters from sorters where \"userId\" = '2311b2d2-4340-473c-9a31-5219db664a38';"
```
Expected: `user_rows` = **1** (no duplicate); one `account` row with provider `google` and username **Rveena**; sorters = **28**.
- [ ] **Step 3 (human):** Confirm the site header shows you logged in as Rveena; open your profile and spot-check sorters.
- [ ] **Step 4:** If Step 2 shows a duplicate user or an error page appeared, STOP — do not deploy. (Spec fallback: custom `signIn` callback to link manually; investigate before proceeding.)

---

### Task 4: Staging deploy + full test pass (interactive)

- [ ] **Step 1:** `git push` (development → staging auto-deploy).
- [ ] **Step 2 (human), on https://sortr-staging.up.railway.app:** run the spec's test list:
  1. Sign out, then Google sign-in again → still lands on `Rveena` (validates the Railway staging env vars, not just local).
  2. New-user test: a second Google account (add it as a Test user first) → creates a new user with a random username.
  3. Magic-link still works (send + click a link on staging).
  4. Mobile: on your phone, Google sign-in completes in the same browser — the whole point of the feature.
  5. After Google sign-in, create/save something (exercises `getServerSession` with a Google-originated JWT).
- [ ] **Step 3:** Verify in DB (same psql checks as Task 3 Step 2, plus the new test user got a `username`).
- [ ] **Step 4 (human):** Google Cloud Console → Audience → **Publish app** (instant at these scopes). Required before real users can use Google sign-in.

---

### Task 5: Prod rollout

- [ ] **Step 1 (human):** Deploy prod via the usual `git push origin development:main`.
- [ ] **Step 2 (human):** On https://sortr.io: Google sign-in with your real account → lands on your existing prod account with your data. Magic-link smoke test too.
- [ ] **Step 3:** Watch for `OAuthAccountNotLinked` or `redirect_uri_mismatch` errors in the first day (Railway logs / user feedback).
- [ ] **Step 4 (optional but recommended):** Reply to the two feedback emails (spencer.kaul@gmail.com, famptbhafk@gmail.com): Google sign-in now available, no email link needed.

## Rollback

Remove the `GoogleProvider` block + the button (one revert). No schema/data migration. Any `account` rows created just sit unused; magic-link users unaffected.
