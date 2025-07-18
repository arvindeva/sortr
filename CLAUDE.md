# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

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
- **Styling**: Tailwind CSS 4 with shadcn/ui components (new-york variant)
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
  - `src/app/results/[id]/` - Sorting results display
  - `src/app/user/[username]/` - User profile pages
- `src/components/` - React components
  - `src/components/ui/` - shadcn/ui components (Button, Card, Badge, Switch, Progress, etc.)
  - Navigation components (Navbar, LoginButton, ShareButton)
  - Theme components (ThemeProvider, ModeToggle)
  - Progress tracking (ProgressProvider)
  - Animated components (AnimatedRankings)
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
- **Results Display**: Ranked results with sharing capabilities and smooth animations
- **Theme System**: Complete dark/light/system theme switching using next-themes
- **Progress Tracking**: Local storage-based progress saving for incomplete sorts
- **User Profiles**: Username-based user profiles with sorter listings
- **Responsive Design**: Mobile-first design with Tailwind CSS

### Application Purpose

sortr is a web app for creating and sharing ranked lists through pairwise comparison. Users can:

- Create sortable lists ("Sorters") with custom items and optional images
- Organize items into groups for better categorization and filtering
- Select specific groups to include in sorting sessions (NEW)
- Rank items using interactive pairwise comparison UI with progress tracking
- Undo recent sorting decisions (last 3 states)
- Save progress locally without account requirement using localStorage
- Login with email to create, save, and manage personal sorters
- Share results pages with ranked outcomes
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
- **Retro Design System**: Use retro components for consistent styling (see Retro Components section)

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
- Results display with sharing capabilities
- User profiles and sorter management
- Complete theming system (dark/light/system)
- Responsive design with mobile support
- LocalStorage-based progress saving with UUID-to-index optimization (95% storage reduction)
- Animated results display with Framer Motion for smooth transitions
- Enhanced progress bar with real-time updates during sorting

🔄 **Recent Major Updates:**

- **Animated Results Display**: Added Framer Motion animations for smooth result transitions with staggered loading effects and special highlighting for top 3 positions (gold, silver, bronze)
- **Enhanced Progress Tracking**: Improved progress bar with real-time updates during sorting sessions and better visual feedback
- **Slug-based URL system**: Groups now use friendly URLs with automatic duplicate handling (e.g., "action-movies", "action-movies-2")
- **Group-specific progress tracking**: Each filter combination maintains separate progress (no more conflicts when switching between different group selections)
- **Real-time progress calculation**: Progress percentage updates immediately after each choice using dynamic total comparison optimization
- **Massive storage optimization**: localStorage usage reduced by 95% using UUID-to-index mapping (12,000 chars → 500 chars for 94 comparisons)
- **Enhanced filters UI**: Simplified checkbox-based interface with collapsible item lists for better usability in dark mode
- **Retro Design System**: Comprehensive retro styling with shared constants, press animations, and consistent component library

## Retro Components

### Design System Overview

The application uses a comprehensive retro design system with shared constants and consistent styling patterns. All components follow the same retro aesthetic with:

- **Press Animation**: Interactive elements move down on hover with shadow disappearing
- **Consistent Borders**: All components use 2px borders with black (light) / white (dark) colors
- **Dramatic Shadows**: Bold drop shadows for depth and retro aesthetic
- **Space Grotesk Font**: Modern geometric font for readability and retro feel
- **Shared Constants**: Centralized styling configuration in `/src/lib/retro-constants.ts`

### Available Components

#### RetroButton
Primary interactive component with press animation and multiple variants:
- `variant`: `"default"` (yellow bg, black text), `"secondary"` (black bg, yellow shadow), `"outline"` (transparent bg, grey shadow), `"ghost"` (transparent bg, grey shadow)
- `size`: `"sm"`, `"default"`, `"lg"`, `"icon"`
- Usage: All buttons, clickable elements, form controls

#### RetroCard
Container component for content with press animation:
- `variant`: `"default"` (white bg), `"primary"` (yellow bg), `"accent"` (cyan bg)
- Includes: `RetroCardHeader`, `RetroCardTitle`, `RetroCardContent`, `RetroCardFooter`, etc.
- Usage: Content containers, listings, summaries

#### RetroBox
Static container for highlights and sections:
- `variant`: `"primary"` (yellow), `"secondary"` (pink), `"accent"` (cyan), `"warning"` (orange), etc.
- `size`: `"sm"`, `"md"`, `"lg"`, `"xl"`
- Usage: Hero sections, headers, highlights

#### RetroLogo
Special interactive component for logos with press animation:
- Same variants as RetroBox but with button-like press behavior
- Usage: Interactive branding elements, clickable logos

#### RetroBadge
Small labels with press animation:
- Multiple color variants with consistent styling
- Usage: Categories, status indicators, tags

### Shared Constants

All components use constants from `/src/lib/retro-constants.ts`:
- **Colors**: Standardized color palette with light/dark variants
- **Shadows**: Helper functions for consistent shadow generation
- **Animations**: Press, lift, and text spacing animations
- **Borders**: Consistent border thickness and colors

### Usage Guidelines

1. **Use RetroButton for all interactive elements** (buttons, clickable items)
2. **Use RetroCard for content containers** (listings, summaries)
3. **Use RetroBox for static highlights** (hero sections, headers)
4. **Use RetroLogo for special interactive branding** (logos, headers)
5. **Use RetroBadge for small labels** (categories, status indicators)

### Implementation Notes

- All components use the same press animation: element moves down, shadow disappears
- Border thickness is standardized to 2px across all components
- Shadow values use shared constants for consistency
- Components are built with `cva` (class-variance-authority) for type-safe variants
- Dark mode support is built into all components
