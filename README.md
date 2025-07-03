# sortr

A web app for creating and sharing ranked lists through pairwise comparison.  
Built with Next.js (App Router), Drizzle ORM, PostgreSQL, and Cloudinary for image uploads.

---

## Features

- Create your own sortable lists (“Sorters”) with custom items and images
- Rank lists using a fun, pairwise comparison UI
- Save progress locally (no account required for sorting)
- Google login for creating and saving your own lists
- Shareable results pages

---

## Tech Stack

- [Next.js 14 (App Router)](https://nextjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL (Railway)](https://railway.app/)
- [Cloudinary](https://cloudinary.com/) (for image hosting)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Getting Started

1. **Install dependencies**
   ```
   npm install
   ```
Configure environment variables
Copy .env.example to .env and fill in your Railway and Cloudinary credentials.

Start the development server

bash
Copy
Edit
npm run dev
Visit http://localhost:3000.
