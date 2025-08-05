# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

**IMPORTANT**: Do not run `npm run build` automatically. Only build when the user explicitly requests it.

### Database

- `npx drizzle-kit generate` - Generate database migrations
- `npx drizzle-kit migrate` - Run database migrations
- `npx drizzle-kit studio` - Open Drizzle Studio for database management

### Cleanup Scripts

- `npm run cleanup:db` - Clean development database
- `npm run cleanup:r2` - Clean R2 storage (sorters only)
- `npm run cleanup:all` - Clean both database and R2 storage

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
- **Image Storage**: Cloudflare R2 with S3-compatible API for scalable object storage
- **Image Processing**: Sharp library for server-side image manipulation (crop, resize)
- **File Uploads**: Direct R2 uploads with presigned URLs and progress tracking
- **Development**: TypeScript with strict mode, Prettier for formatting

### Project Structure

- `src/app/` - Next.js App Router pages and layouts
  - `src/app/api/` - API routes
    - `src/app/api/auth/[...nextauth]/` - NextAuth.js authentication endpoint
    - `src/app/api/sorters/` - Sorter CRUD operations with versioned R2 paths
    - `src/app/api/sorting-results/` - Save and retrieve sorting results with snapshots
    - `src/app/api/browse/` - Browse and search sorters with filtering
    - `src/app/api/user/` - User profile operations
    - `src/app/api/upload-avatar/` - Avatar upload with image processing and R2 storage
    - `src/app/api/remove-avatar/` - Avatar deletion from R2 and database cleanup
    - `src/app/api/upload-tokens/` - Generate presigned upload URLs for direct R2 uploads
    - `src/app/api/revalidate/` - ISR cache revalidation endpoint
    - `src/app/api/rankings/[id]/` - Individual ranking data with version-specific queries
  - `src/app/auth/` - Authentication pages (signin, error, verify-request)
  - `src/app/browse/` - Browse and search sorters with category filtering
  - `src/app/create/` - Create sorter page with direct upload and tag management
  - `src/app/sorter/[slug]/` - Individual sorter view and management
    - `src/app/sorter/[slug]/filters/` - Tag selection for sorting sessions
    - `src/app/sorter/[slug]/sort/` - Interactive sorting interface with progress tracking
  - `src/app/rankings/[id]/` - Ranking results display with immutable snapshots
  - `src/app/user/[username]/` - User profile pages with sorter collections
  - `src/app/sitemap.xml/` - Dynamic sitemap generation
- `src/components/` - React components
  - `src/components/ui/` - Neobrutalism components (Button, Card, Badge, Progress, etc.)
  - Custom UI components (SortingBarsLoader, SortPageSkeleton, ComparisonCard, SorterCard, PageHeader)
  - Upload components (CoverImageUpload, FileUploadZone, UploadProgressDialog)
  - Navigation components (Navbar, LoginButton, ShareButton)
  - Theme components (ThemeProvider, ModeToggle)
  - Progress tracking (ProgressProvider)
  - Animated components (AnimatedRankings with medal emojis, RankingImageLayout)
  - User management (EditUsernameButton, DeleteSorterButton, UserProfileHeader)
  - Tag management (TagManagement with drag-and-drop reordering)
- `src/db/` - Database configuration and schema
- `src/hooks/` - Custom React hooks
  - `src/hooks/use-direct-upload.ts` - Direct R2 upload with progress tracking
  - `src/hooks/use-download-ranking-image.ts` - PNG export functionality
- `src/lib/` - Utility functions and shared logic
  - `src/lib/auth.ts` - NextAuth.js configuration
  - `src/lib/sorting.ts` - Sorting algorithm implementations
  - `src/lib/interactive-merge-sort.ts` - Interactive sorting logic
  - `src/lib/validations.ts` - Zod validation schemas
  - `src/lib/username.ts` - Username generation utilities
  - `src/lib/r2.ts` - Cloudflare R2 utilities with versioned path generation
  - `src/lib/image-processing.ts` - Sharp-based image processing (crop, resize, validation)
  - `src/lib/image-compression.ts` - Client-side image compression for uploads
  - `src/lib/image-utils.ts` - Image utility functions
  - `src/lib/session-manager.ts` - Upload session management
  - `src/lib/version-cleanup.ts` - Reference-counted cleanup for versioned storage
  - `src/lib/revalidation.ts` - ISR cache management utilities
- `src/types/` - TypeScript type definitions
  - `src/types/upload.ts` - Upload system types and interfaces

### Key Features & Components

- **Authentication System**: NextAuth.js v4 with email-based authentication and Drizzle adapter
- **Sorter Creation**: Form-based sorter creation with direct R2 uploads and tag management
- **Tag System**: Complete tag-based organization with drag-and-drop reordering and filtering
- **Direct Upload System**: Multi-file direct R2 uploads with progress tracking and session management
- **Interactive Sorting**: Pairwise comparison UI with progress tracking and undo functionality
- **Rankings Snapshots**: Immutable rankings with database versioning and historical data preservation
- **Rankings Display**: Ranked results with sharing capabilities, smooth animations, and medal emojis for top 3 positions
- **Downloadable Images**: PNG export of rankings with neobrutalism design using html-to-image
- **Search Functionality**: Global search bar in navbar with category filtering and pagination
- **Theme System**: Complete dark/light/system theme switching using next-themes
- **Progress Tracking**: Local storage-based progress saving for incomplete sorts
- **User Profiles**: Username-based user profiles with sorter collections and avatar management
- **Avatar Management**: Complete avatar upload/removal system with Cloudflare R2 storage, image processing, and shimmer loading animations
- **Responsive Design**: Mobile-first design with Tailwind CSS and neobrutalism styling
- **Notifications**: Neobrutalism-styled toast notifications using Sonner

### Application Purpose

sortr is a web app for creating and sharing ranked lists through pairwise comparison. Users can:

- Create sortable lists ("Sorters") with custom items and optional images using direct R2 uploads
- Organize items with tags for better categorization and filtering
- Select specific tags to include in sorting sessions
- Rank items using interactive merge sort UI with progress tracking
- Undo recent sorting decisions (last 1 state for optimal storage)
- Save progress locally without account requirement using localStorage
- Login with email to create, save, and manage personal sorters
- Share ranking pages with immutable ranked outcomes and downloadable images
- Download ranking images as PNG with neobrutalism design
- Upload and manage personal avatars with automatic image processing
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
- **sorters** - Main sorter entities with title, description, category, usage tracking, and versioning
- **sorterTags** - Tags within sorters for categorizing items with sort order and slug-based filtering
- **sorterItems** - Individual items within sorters with tag slug arrays for fast filtering
- **sortingResults** - Saved sorting results with rankings, selected tag slugs, and version snapshots
- **uploadSessions** - Upload session tracking for direct R2 uploads with expiration
- **sessionFiles** - Files uploaded within sessions before being linked to sorters
- **sorterHistory** - Historical sorter snapshots for immutable rankings with version tracking

### Environment Variables

Requires configuration for:

- `DATABASE_URL` - PostgreSQL database connection string
- `NEXTAUTH_URL` - Application URL for NextAuth.js
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js
- `EMAIL_SERVER` - SMTP server configuration for email authentication
- `EMAIL_FROM` - From email address for authentication emails
- `R2_ACCOUNT_ID` - Cloudflare R2 account identifier
- `R2_ACCESS_KEY_ID` - R2 access key for S3-compatible API
- `R2_SECRET_ACCESS_KEY` - R2 secret key for authentication
- `R2_BUCKET_NAME` - R2 bucket name for image storage
- `R2_PUBLIC_URL` - Public URL for R2 bucket (optional, for direct serving)
- `REVALIDATION_SECRET` - Secret key for ISR tag-based revalidation

### Current Implementation Status

✅ **Completed Features:**

- User authentication with email verification
- Sorter creation with tags and direct R2 uploads
- Tag-based filtering interface with slug-based URLs and drag-and-drop management
- Direct R2 upload system with progress tracking and session management
- Interactive pairwise comparison sorting with real-time progress tracking and tag-specific progress isolation
- Rankings snapshots with database versioning for immutable rankings
- Undo functionality (last 1 state for optimal storage)
- Rankings display with sharing capabilities and version-specific queries
- User profiles and sorter management
- Complete theming system (dark/light/system) with neobrutalism design
- Responsive design with mobile support
- LocalStorage-based progress saving with UUID-to-index optimization (95% storage reduction)
- Animated rankings display with Framer Motion for smooth transitions
- Enhanced progress bar with real-time updates during sorting
- **Avatar Upload System**: Complete avatar management with Cloudflare R2 storage, Sharp image processing (center crop to 200x200), client-side management with TanStack Query, shimmer loading animations, and proper error handling
- **Downloadable ranking images**: PNG export with html-to-image, neobrutalism Panel design, medal emojis, 3-column layout for 4+ items, and consistent header/footer styling

🔄 **Recent Major Updates:**

- **Tags System Migration**: Complete migration from groups to tags system with database schema updates, tag slug arrays for fast filtering, and drag-and-drop tag management with sort ordering
- **Direct R2 Upload System**: Implemented sophisticated direct upload system with presigned URLs, progress tracking, session management, and multi-file batch uploads with retry logic
- **Rankings Snapshots Implementation**: Database versioning system for immutable rankings with sorterHistory table, version-specific queries, and reference-counted cleanup
- **Force-Dynamic Rendering**: Migrated homepage, user profiles, and sorter detail pages from time-based caching to force-dynamic rendering for always-fresh data
- **Enhanced Loading States**: Created custom `SortingBarsLoader` component with animated sorting bars using site primary colors, replaced simple text-based loading states across sort/filter/auth pages
- **Font System Update**: Migrated from DM Sans to Poppins throughout the application for improved readability and modern aesthetics
- **Component Library Expansion**: Added neobrutalism Skeleton, Dialog, and Panel components, created reusable components for consistent loading animations
- **Upload Progress System**: Comprehensive upload progress tracking with determinate/indeterminate states, file-level progress, and error handling with retry mechanisms
- **Session Management**: Upload session tracking with expiration, cleanup utilities, and proper session file management
- **Cache Management**: ISR tag-based revalidation system with proper cache invalidation for dynamic content updates

## Direct R2 Upload System

### Technical Architecture

The application uses a sophisticated direct upload system that bypasses server intermediaries for optimal performance and scalability:

- **Presigned URLs**: Generate secure, time-limited upload URLs directly to Cloudflare R2
- **Session Management**: Track upload sessions with database persistence and expiration
- **Progress Tracking**: Real-time upload progress with file-level granularity
- **Batch Processing**: Efficient multi-file uploads with parallel processing
- **Error Handling**: Comprehensive retry logic with exponential backoff

### Upload Flow

1. **Token Request**: Client requests presigned upload URLs from `/api/upload-tokens`
2. **Session Creation**: Server creates upload session and generates presigned URLs
3. **Direct Upload**: Client uploads files directly to R2 using presigned URLs
4. **Progress Tracking**: Real-time progress updates via custom hooks
5. **Sorter Creation**: After uploads complete, create sorter with file references
6. **Session Cleanup**: Automatic cleanup of expired sessions and orphaned files

### Upload Session Management

```typescript
// Upload session lifecycle
interface UploadSession {
  id: string; // UUID session identifier
  userId: string; // User who initiated upload
  status: "pending" | "uploading" | "complete" | "expired" | "failed";
  createdAt: Date; // Session creation timestamp
  expiresAt: Date; // Automatic expiration (15 minutes)
  metadata?: Record<string, any>; // Additional session data
}
```

### File Processing Pipeline

1. **Client Validation**: File type, size, and format validation before upload
2. **Image Compression**: Automatic client-side compression for large images
3. **Unique Naming**: Generate collision-resistant file names with suffixes
4. **Versioned Paths**: R2 storage uses versioned paths (`sorters/{id}/v{version}/`)
5. **Sharp Processing**: Server-side image processing for thumbnails and optimization

### Performance Optimizations

- **Parallel Uploads**: Multiple files upload simultaneously with configurable concurrency
- **Retry Logic**: Exponential backoff retry for failed uploads with maximum attempt limits
- **Progress Batching**: Efficient progress updates to prevent UI thrashing
- **Memory Management**: Streaming uploads to prevent memory exhaustion on large files
- **CDN Integration**: Immediate CDN availability through R2 public URLs

## Rankings Snapshots System

### Immutable Rankings Architecture

The application implements a sophisticated versioning system to ensure rankings remain immutable regardless of sorter modifications:

- **Database Versioning**: All sorter-related tables include version columns
- **Historical Snapshots**: Complete sorter snapshots stored in `sorterHistory` table
- **Version-Specific Queries**: Rankings always query historical data by version
- **Reference Counting**: Smart cleanup prevents deletion of referenced versions

### Versioning Schema

```sql
-- Core versioning columns added to existing tables
sorters: version, deleted
sorterItems: version
sorterTags: version (via sorterId relationship)
sortingResults: version (snapshot reference)

-- New historical data table
sorterHistory: sorterId, title, description, coverImageUrl, version, archivedAt
```

### Versioned R2 Storage

```
sorters/{sorterId}/v{version}/cover.jpg
sorters/{sorterId}/v{version}/item-{slug}.jpg
sorters/{sorterId}/v{version}/group-{slug}.jpg
```

### Immutability Guarantees

- **Perfect Isolation**: Rankings display exactly what was ranked, never live data
- **Deletion Survival**: Rankings persist even after sorter deletion via historical snapshots
- **CDN Cache Resolution**: Versioned paths eliminate persistent cache issues
- **Storage Efficiency**: Only unique versions stored, not per-ranking duplicates

### Version Lifecycle Management

1. **Creation**: New sorters start at version 1 with immediate history entry
2. **Modification**: Future edits increment version and create new history entries
3. **Reference Tracking**: System tracks which rankings reference each version
4. **Cleanup**: Automated cleanup removes unreferenced versions (future feature)

## Design System

### Neobrutalism.dev Components

The application uses the neobrutalism.dev component library, which provides shadcn/ui components with automatic retro/neobrutalism styling via CSS variables. This approach eliminates the need for manual component retrofitting and provides consistent styling across the entire application.

### Design Philosophy

All components follow the neobrutalism aesthetic principles:

- **Consistent Borders**: All components use 2px borders with black (light) / white (dark) colors (`border-2 border-border`)
- **Dramatic Shadows**: Bold drop shadows for depth and retro aesthetic (`shadow-shadow`)
- **Poppins Font**: Modern geometric font for readability and retro feel
- **CSS Variables**: Centralized styling configuration in `/src/app/globals.css`

### Component Installation

**IMPORTANT**: Always use neobrutalism.dev components when available instead of creating custom implementations.

Components are installed from the neobrutalism.dev registry:

```bash
npx shadcn@latest add https://neobrutalism.dev/r/button.json
```

Before implementing any UI component, check if it exists at https://neobrutalism.dev/components/ and use the official version with the installation command above. Only create custom implementations if the component doesn't exist on neobrutalism.dev.

### Core Components

#### Button

Neobrutalism Button component with built-in retro styling:

- `variant`: `"default"` (rosa bg, black text), `"reverse"` (inverse press animation), `"noShadow"` (no shadow), `"neutral"` (secondary bg), `"neutralNoShadow"`
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

- `variant`: `"primary"` (rosa)
- `size`: `"sm"`, `"md"`, `"lg"`, `"xl"`
- Usage: Hero sections, headers, highlights

#### Panel (Neobrutalism)

Container component with built-in neobrutalism styling:

- Used for downloadable ranking images and content containers
- Features: Automatic borders, shadows, and spacing
- Includes: `PanelHeader`, `PanelTitle`, `PanelContent`

#### Progress

Neobrutalism Progress component with built-in retro styling:

- `h-4` height with thick borders and primary color fill
- Features: Border separator on indicator, secondary background, neobrutalist shadows

#### Skeleton

Neobrutalism Skeleton component for loading states:

- Built-in pulse animation with retro styling
- Used in loading states across the application
- Features: Consistent borders and spacing

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
5. **Use Panel for structured content containers** (ranking images, complex layouts)
6. **Use Skeleton for loading states** (matching actual content layout)

### Implementation Notes

- Components maintain standard shadcn/ui APIs for easy migration
- Press animation is built into components via neobrutalism classes
- Border thickness is standardized to 2px across all components
- Shadow values are controlled via CSS variables for consistency
- Components use `cva` (class-variance-authority) for type-safe variants
- Full dark mode support is built into all components via CSS variables
- No manual component retrofitting needed - styling is automatic via CSS variables

## Tag System Architecture

### Tag-Based Organization

The application uses a sophisticated tag system for organizing and filtering sorter items:

- **Database Schema**: `sorterTags` table with sort order, slug generation, and unique constraints
- **Array Indexing**: Items store tag slug arrays with GIN index for fast overlap queries
- **Drag-and-Drop Management**: Client-side tag reordering with immediate database persistence
- **Slug-Based Filtering**: URL-based tag selection for sorting sessions

### Tag Management Features

- **Dynamic Creation**: Add tags during sorter creation with automatic slug generation
- **Drag-and-Drop Reordering**: Visual tag reordering with sort order persistence
- **Validation**: Duplicate name/slug prevention with client and server validation
- **Filtering Interface**: Multi-select tag filtering for sorting sessions

### Performance Optimizations

- **GIN Indexing**: Fast array overlap queries for tag-based item filtering
- **Slug Arrays**: Denormalized tag slugs on items for efficient querying
- **Composite Constraints**: Unique name and slug constraints per sorter
- **Sort Order Indexing**: Optimized queries for tag ordering

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
ALWAYS use tailwind v4
