# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes (e.g., `page.tsx`, API `route.ts`).
- `src/components/`: Reusable UI and feature components; files use kebab-case (e.g., `user-profile-header.tsx`).
- `src/lib/`, `src/hooks/`, `src/types/`: Shared utilities, hooks, and TypeScript types.
- `src/db/`: Drizzle ORM setup and `schema.ts` definitions. Migrations live in `drizzle/`.
- `public/`: Static assets. `screenshots/` holds reference images.
- `scripts/`: Developer utilities (cleanup, migrations helpers). See safety notes below.
- `docs/`: Internal documentation and reference notes.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server (Next.js).
- `npm run build`: Production build.
- `npm start`: Serve the built app.
- `npm run lint`: ESLint via Next.js rules.
- `npm run type-check`: TypeScript check without emit.
- `npx drizzle-kit migrate`: Apply DB migrations; `npx drizzle-kit studio` to inspect.
- Examples: `npx tsx scripts/cleanup-dev-all.ts` (cleans dev DB and R2 data; requires confirmation and env flags).

## Coding Style & Naming Conventions
- TypeScript + React (functional components). Indentation: 2 spaces, no tabs.
- Filenames: kebab-case for files, PascalCase for components inside files if exported.
- Tailwind CSS v4 for styling; co-locate classes in JSX.
- Formatting: Prettier (`prettier-plugin-tailwindcss`). Run Prettier on save; avoid manual reflow.

## Testing Guidelines
- No formal test runner yet. Use:
  - `npm run type-check` for quick safety checks.
- Prefer small, testable helpers in `src/lib/` and hooks in `src/hooks/`.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject lines (e.g., "Fix image preloading on mobile"). Group related changes.
- PRs: include a clear description, linked issue, and screenshots/GIFs for UI changes. Note any DB or env impacts and update `docs/` where applicable.
- Ensure builds pass, types are clean, and linting is fixed before requesting review.

## Security & Configuration Tips
- Copy `.env.example` to `.env`. Never commit secrets.
- Drizzle uses `DATABASE_URL`. For destructive scripts, set `NODE_ENV=development` and `DEV_CLEANUP_ENABLED=true` to proceed.
- Validate storage credentials before running cleanup scripts; they intentionally preserve users/avatars but remove sorter data.
