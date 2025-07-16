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

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM (Railway hosted)
- **Image Storage**: Cloudinary
- **Authentication**: NextAuth.js with Email provider
- **Theme**: next-themes for dark/light mode

### Project Structure

- `src/app/` - Next.js App Router pages and layouts
  - `src/app/api/` - API routes (auth, sorters, user)
  - `src/app/auth/` - Authentication pages (signin, error)
  - `src/app/create/` - Create sorter page
  - `src/app/sorter/[id]/` - Individual sorter view
  - `src/app/user/[username]/` - User profile pages
- `src/components/` - React components
  - `src/components/ui/` - shadcn/ui components (Button, Card, DropdownMenu, Input)
- `src/db/` - Database configuration and schema
- `src/lib/` - Utility functions and shared logic

### Key Components

- **Layout**: Root layout with theme provider and font configuration
- **Navbar**: Navigation with login button and theme toggle
- **Theme System**: Complete dark/light/system theme switching using next-themes
- **UI Components**: shadcn/ui components with "new-york" style variant
- **Authentication**: NextAuth.js with Drizzle adapter for email-based auth
- **Database Schema**: Users, sorters, sorter items, and NextAuth tables

### Application Purpose

sortr is a web app for creating and sharing ranked lists through pairwise comparison. Users can:

- Create sortable lists ("Sorters") with custom items and images
- Rank items using pairwise comparison UI
- Save progress locally without account requirement
- Login with email to create and save lists
- Share results pages

### Code Conventions

- Uses TypeScript with strict mode
- Path aliases configured: `@/*` maps to `./src/*`
- shadcn/ui component aliases: `@/components`, `@/lib/utils`, `@/components/ui`
- Tailwind CSS with CSS variables for theming
- Lucide React for icons
- clsx + tailwind-merge utility pattern for conditional classes
- **Data Fetching**: Use TanStack Query instead of useEffect for API calls when possible
- **State Management**: Prefer TanStack Query for server state, React state for UI state

### Environment Variables

Requires configuration for:

- `DATABASE_URL` - PostgreSQL database connection string
- `NEXTAUTH_URL` - Application URL for NextAuth.js
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js
- `EMAIL_SERVER` - SMTP server configuration for email authentication
- `EMAIL_FROM` - From email address for authentication emails
- Cloudinary credentials for image hosting (if using image uploads)
