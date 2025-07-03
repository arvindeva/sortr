# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Setup
- Copy `.env.example` to `.env` and configure Railway and Cloudinary credentials
- `npm install` - Install dependencies

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM (Railway hosted)
- **Image Storage**: Cloudinary
- **Authentication**: Google OAuth (mentioned in README)
- **Theme**: next-themes for dark/light mode

### Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components
- `src/components/ui/` - shadcn/ui components (Button, Card, DropdownMenu)
- `src/lib/` - Utility functions and shared logic

### Key Components
- **Layout**: Root layout with theme provider and font configuration
- **Navbar**: Navigation with login button and theme toggle
- **Theme System**: Complete dark/light/system theme switching using next-themes
- **UI Components**: shadcn/ui components with "new-york" style variant

### Application Purpose
sortr is a web app for creating and sharing ranked lists through pairwise comparison. Users can:
- Create sortable lists ("Sorters") with custom items and images
- Rank items using pairwise comparison UI
- Save progress locally without account requirement
- Login with Google to create and save lists
- Share results pages

### Code Conventions
- Uses TypeScript with strict mode
- Path aliases configured: `@/*` maps to `./src/*`
- shadcn/ui component aliases: `@/components`, `@/lib/utils`, `@/components/ui`
- Tailwind CSS with CSS variables for theming
- Lucide React for icons
- clsx + tailwind-merge utility pattern for conditional classes

### Environment Variables
Requires configuration for:
- Railway database credentials
- Cloudinary image hosting credentials