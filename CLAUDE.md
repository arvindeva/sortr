# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

**IMPORTANT**: Do not run `npm run build` automatically. Only build when the user explicitly requests it.

### Database

- `npx drizzle-kit generate` - Generate database migrations
- `npx drizzle-kit migrate` - Run database migrations
- `npx drizzle-kit studio` - Open Drizzle Studio for database management

### Environment Setup

- Copy `.env.example` to `.env` and configure required environment variables
- `npm install` - Install dependencies

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS 4 with neobrutalism.dev components (shadcn/ui with automatic retro styling via CSS variables)
- **Database**: PostgreSQL with Drizzle ORM and Drizzle Kit
- **State Management**: TanStack Query for server state, React state for UI state
- **Authentication**: NextAuth.js v4 with Email provider and Drizzle adapter
- **Theme**: next-themes for dark/light/system mode switching
- **Forms**: react-hook-form
- **Validation**: Zod for schema validation
- **Compression**: lz-string for data compression
- **UI Icons**: Lucide React
- **Notifications**: Sonner for toast notifications
- **Animations**: Framer Motion for smooth animations and transitions
- **Development**: TypeScript with strict mode, Prettier for formatting

### Project Structure

- `src/app/` - Next.js App Router pages and layouts
  - `src/app/api/` - API routes
    - `src/app/api/auth/[...nextauth]/` - NextAuth.js authentication endpoint
    - `src/app/api/sorters/` - Sorter CRUD operations and fetching
    - `src/app/api/sorting-results/` - Save and retrieve sorting results
    - `src/app/api/user/` - User profile operations
  - `src/app/auth/` - Authentication pages (signin, error, verify-request)
  - `src/app/create/` - Create sorter page with form validation
  - `src/app/sorter/[id]/` - Individual sorter view and management
    - `src/app/sorter/[id]/filters/` - Group selection for sorting (NEW)
    - `src/app/sorter/[id]/sort/` - Interactive sorting interface
  - `src/app/rankings/[id]/` - Ranking results display
  - `src/app/user/[username]/` - User profile pages
- `src/components/` - React components
  - `src/components/ui/` - shadcn/ui components (Button, Card, Badge, Switch, Progress, Skeleton, Dialog, etc.)
  - Custom UI components (SortingBarsLoader, SortPageSkeleton, ComparisonCard)
  - Navigation components (Navbar, LoginButton, ShareButton)
  - Theme components (ThemeProvider, ModeToggle)
  - Progress tracking (ProgressProvider)
  - Animated components (AnimatedRankings)
  - User management (EditUsernameButton, DeleteSorterButton, UserProfileHeader)
- `src/db/` - Database configuration and schema
- `src/lib/` - Utility functions and shared logic
  - `src/lib/auth.ts` - NextAuth.js configuration
  - `src/lib/sorting.ts` - Sorting algorithm implementations
  - `src/lib/interactive-merge-sort.ts` - Interactive sorting logic
  - `src/lib/validations.ts` - Zod validation schemas
  - `src/lib/username.ts` - Username generation utilities
- `src/types/` - TypeScript type definitions

### Key Features & Components

- **Authentication System**: NextAuth.js v4 with email-based authentication and Drizzle adapter
- **Sorter Creation**: Form-based sorter creation with support for groups and individual items
- **Group Filtering**: NEW - Filter page for selecting which groups to include in sorting
- **Interactive Sorting**: Pairwise comparison UI with progress tracking and undo functionality
- **Rankings Display**: Ranked results with sharing capabilities and smooth animations
- **Downloadable Images**: PNG export of rankings with neobrutalism design using html-to-image
- **Search Functionality**: Global search bar in navbar (desktop input field, mobile expandable overlay) that redirects to browse page with query parameters
- **Theme System**: Complete dark/light/system theme switching using next-themes
- **Progress Tracking**: Local storage-based progress saving for incomplete sorts
- **User Profiles**: Username-based user profiles with sorter listings
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Notifications**: Neobrutalism-styled toast notifications using Sonner

### Application Purpose

sortr is a web app for creating and sharing ranked lists through pairwise comparison. Users can:

- Create sortable lists ("Sorters") with custom items and optional images
- Organize items into groups for better categorization and filtering
- Select specific groups to include in sorting sessions
- Rank items using merge sort, UI with progress tracking
- Undo recent sorting decisions (last 1 states)
- Save progress locally without account requirement using localStorage
- Login with email to create, save, and manage personal sorters
- Share ranking pages with ranked outcomes and downloadable images
- Download ranking images as PNG with neobrutalism design
- View and track completion/view counts for public sorters

### Code Conventions

- Uses TypeScript with strict mode
- Path aliases configured: `@/*` maps to `./src/*`
- shadcn/ui component aliases: `@/components`, `@/lib/utils`, `@/components/ui`
- Tailwind CSS with CSS variables for theming
- Lucide React for icons
- clsx + tailwind-merge utility pattern for conditional classes
- **Data Fetching**: Use TanStack Query instead of useEffect for API calls when possible
- **State Management**: Prefer TanStack Query for server state, React state for UI state
- **Design System**: Use neobrutalism.dev components with automatic retro styling (see Design System section)

### Database Schema

The application uses PostgreSQL with Drizzle ORM and includes these main tables:

- **user** - User accounts with email, username, and profile data
- **account, session, verificationToken** - NextAuth.js authentication tables
- **sorters** - Main sorter entities with title, description, category, and usage tracking
- **sorterGroups** - Groups within sorters for categorizing items (NEW)
- **sorterItems** - Individual items within sorters, optionally linked to groups
- **sortingResults** - Saved sorting results with rankings and selected groups

### Environment Variables

Requires configuration for:

- `DATABASE_URL` - PostgreSQL database connection string
- `NEXTAUTH_URL` - Application URL for NextAuth.js
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js
- `EMAIL_SERVER` - SMTP server configuration for email authentication
- `EMAIL_FROM` - From email address for authentication emails

### Current Implementation Status

✅ **Completed Features:**

- User authentication with email verification
- Sorter creation with groups and individual items
- Group filtering interface with slug-based URLs and simplified checkbox UI
- Interactive pairwise comparison sorting with real-time progress tracking and group-specific progress isolation
- Undo functionality (last 1 state for optimal storage)
- Rankings display with sharing capabilities
- User profiles and sorter management
- Complete theming system (dark/light/system)
- Responsive design with mobile support
- LocalStorage-based progress saving with UUID-to-index optimization (95% storage reduction)
- Animated rankings display with Framer Motion for smooth transitions
- Enhanced progress bar with real-time updates during sorting
- **Downloadable ranking images**: PNG export with html-to-image, neobrutalism Panel design, medal emojis, 3-column layout for 4+ items, and consistent header/footer styling

🔄 **Recent Major Updates:**

- **Force-Dynamic Rendering**: Migrated homepage, user profiles, and sorter detail pages from time-based caching to force-dynamic rendering for always-fresh data, eliminating stale content issues where deleted sorters would show as broken links
- **Enhanced Loading States**: Created custom `SortingBarsLoader` component with animated sorting bars using site primary colors, replaced simple text-based loading states across sort/filter/auth pages with consistent animated components
- **Skeleton Loading Implementation**: Added comprehensive skeleton loading for sort page that matches actual interface layout with proper responsive design and neobrutalist styling
- **UX Improvements**: Fixed loading state flash issues in create/edit/delete actions by removing `finally` blocks and maintaining loading states until navigation completes, providing seamless user experience
- **Component Library Expansion**: Added neobrutalism Skeleton (`npx shadcn@latest add https://neobrutalism.dev/r/skeleton.json`) and Dialog components, created reusable SortingBarsLoader for consistent loading animations
- **Authentication UI**: Enhanced "Check your email" page with red envelope icon (white background in light mode, secondary-background in dark mode) and improved text contrast using `text-foreground`
- **Homepage Enhancement**: Wrapped main title and subtitle in primary Box component for better visual hierarchy and consistent styling with site design language
- **Downloadable Ranking Images**: Implemented PNG export feature using html-to-image library with custom RankingImageLayout component featuring neobrutalism Panel design, medal emojis for top 3, 3-column vertical layout for remaining items, rounded corners with shadows, and consistent header/footer rosa backgrounds. Includes progress bar exclusion for download links and development preview component.

## Design System

### Neobrutalism.dev Components

The application uses the neobrutalism.dev component library, which provides shadcn/ui components with automatic retro/neobrutalism styling via CSS variables. This approach eliminates the need for manual component retrofitting and provides consistent styling across the entire application.

### Design Philosophy

All components follow the neobrutalism aesthetic principles:

- **Consistent Borders**: All components use 2px borders with black (light) / white (dark) colors (`border-2 border-border`)
- **Dramatic Shadows**: Bold drop shadows for depth and retro aesthetic (`shadow-shadow`)
- **DM Sans Font**: Modern geometric font for readability and retro feel
- **CSS Variables**: Centralized styling configuration in `/src/app/globals.css`

### Component Installation

**IMPORTANT**: Always use neobrutalism.dev components when available instead of creating custom implementations.

Components are installed from the neobrutalism.dev registry:

```bash
npx shadcn@latest add https://neobrutalism.dev/r/button.json
npx shadcn@latest add https://neobrutalism.dev/r/card.json
npx shadcn@latest add https://neobrutalism.dev/r/badge.json
npx shadcn@latest add https://neobrutalism.dev/r/input.json
npx shadcn@latest add https://neobrutalism.dev/r/textarea.json
npx shadcn@latest add https://neobrutalism.dev/r/select.json
npx shadcn@latest add https://neobrutalism.dev/r/switch.json
npx shadcn@latest add https://neobrutalism.dev/r/progress.json
npx shadcn@latest add https://neobrutalism.dev/r/skeleton.json
npx shadcn@latest add https://neobrutalism.dev/r/dialog.json
npx shadcn@latest add https://neobrutalism.dev/r/sonner.json
```

Before implementing any UI component, check if it exists at https://neobrutalism.dev/components/ and use the official version with the installation command above. Only create custom implementations if the component doesn't exist on neobrutalism.dev.

### Core Components

#### Button

Neobrutalism Button component with built-in retro styling:

- `variant`: `"default"` (rosa bg, black text), `"reverse"` (inverse press animation), `"noShadow"` (no shadow), `"neutral"` (secondary bg)
- `size`: `"sm"`, `"default"`, `"lg"`, `"icon"`
- Features: Built-in press animation, retro colors, bold shadows

#### Card

Neobrutalism Card component with built-in retro styling:

- Single variant with retro borders and shadows
- Includes: `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardAction`, `CardDescription`
- Features: Automatic retro borders, dramatic shadows, consistent spacing

#### Badge

Neobrutalism Badge component with built-in retro styling:

- `variant`: `"default"` (main color), `"neutral"` (secondary bg)
- Features: Built-in retro styling, consistent borders, small shadows

#### Box (Custom)

Custom container component for highlights and sections:

- `variant`: `"primary"` (rosa).
- `size`: `"sm"`, `"md"`, `"lg"`, `"xl"`
- Usage: Hero sections, headers, highlights

#### Logo (Custom)

Interactive branding component with press animation:

- Same variants as Box but with button-like press behavior
- Usage: Interactive branding elements, clickable logos

#### ComparisonCard (Custom)

Specialized card component for sorting interface:

- Primary color background (`bg-main`) with black text (white in dark mode for UI elements)
- Image area flush with top border, text area at bottom with border separator
- Built-in hover effects and neobrutalist styling
- Usage: Pairwise comparison interface in sorting

#### Progress

Neobrutalism Progress component with built-in retro styling:

- `h-4` height with thick borders and primary color fill
- Features: Border separator on indicator, secondary background, neobrutalist shadows

### CSS Variables

All styling is controlled via CSS variables in `/src/app/globals.css`:

- **Colors**: `--main`, `--background`, `--foreground`, `--border`, etc.
- **Shadows**: `--shadow: 2px 2px 0px 0px var(--border)`
- **Spacing**: `--spacing-boxShadowX`, `--spacing-boxShadowY`, `--spacing-reverseBoxShadowX`, `--spacing-reverseBoxShadowY`
- **Borders**: `--radius-base: 10px`
- **Fonts**: `--font-weight-base: 500`, `--font-weight-heading: 800`

### Usage Guidelines

1. **Use Button for all interactive elements** (buttons, clickable items, form controls)
2. **Use Card for content containers** (listings, summaries, content blocks)
3. **Use Badge for small labels** (categories, status indicators, tags)
4. **Use Box for static highlights** (hero sections, headers, callouts)
5. **Use Logo for special interactive branding** (logos, headers)

### Implementation Notes

- Components maintain standard shadcn/ui APIs for easy migration
- Press animation is built into components via neobrutalism classes
- Border thickness is standardized to 2px across all components
- Shadow values are controlled via CSS variables for consistency
- Components use `cva` (class-variance-authority) for type-safe variants
- Full dark mode support is built into all components via CSS variables
- No manual component retrofitting needed - styling is automatic via CSS variables
