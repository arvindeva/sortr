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
- **Results Display**: Ranked results with sharing capabilities
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
- Group filtering interface for selecting which groups to sort
- Interactive pairwise comparison sorting with progress tracking
- Undo functionality (last 3 states)
- Results display with sharing capabilities
- User profiles and sorter management
- Complete theming system (dark/light/system)
- Responsive design with mobile support
- LocalStorage-based progress saving
