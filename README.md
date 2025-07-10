# sortr

A web app for creating and sharing ranked lists through pairwise comparison.  
Built with Next.js (App Router), Drizzle ORM, PostgreSQL, and Cloudinary for image uploads.

---

## Features

- Create your own sortable lists ("Sorters") with custom items and images
- Rank lists using a fun, pairwise comparison UI
- Save progress locally (no account required for sorting)
- Email authentication for creating and saving your own lists
- User profiles with sorter collections
- View tracking and engagement metrics
- Dark/light theme support
- Shareable results pages

---

## Tech Stack

- [Next.js 15 (App Router)](https://nextjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL (Railway)](https://railway.app/)
- [NextAuth.js](https://next-auth.js.org/) (Email provider)
- [Cloudinary](https://cloudinary.com/) (for image hosting)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) (UI components)
- [next-themes](https://github.com/pacocoursey/next-themes) (theme switching)

---

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in your credentials:
   - Database (Railway PostgreSQL)
   - NextAuth.js settings
   - Email server (SMTP)
   - Cloudinary (optional, for image uploads)

3. **Run database migrations**
   ```bash
   npx drizzle-kit migrate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Visit** [http://localhost:3000](http://localhost:3000)

---

## Database Management

- `npx drizzle-kit generate` - Generate new migrations
- `npx drizzle-kit migrate` - Run migrations  
- `npx drizzle-kit studio` - Open Drizzle Studio