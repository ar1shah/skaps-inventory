# SKAPS Parts Inventory

A parts inventory and admin dashboard I built for **SKAPS** — a real company whose maintenance team uses this in production every day.

The crew still submits parts through the same two Google Forms they always have ("parts used" and "parts request"). This app pulls those submissions in, tracks stock on the shelf, and gives admins a dashboard to manage everything.

## What it does

- **Public inventory** — browse parts, search by SKAPS number, filter by category/location
- **Google Form integration** — new form responses flow in automatically via Apps Script
- **Admin dashboard** — usage stats, notifications, submission logs, master parts list
- **Stock tracking** — used parts decrement inventory; low-stock and unknown-part alerts

## Tech stack

- **Next.js 15** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**-style components
- **Supabase** (Postgres, auth, row-level security)
- **Recharts** for charts
- Hosted on **Vercel** + **Supabase Cloud**

## Quick start

```sh
pnpm install
pnpm dev
```

Env vars live in `.env.local` (see `.env.example`). Migrations are in `supabase/migrations/`.

## Repo notes

Internal project — not meant as open-source docs. Detailed setup (Google Forms wiring, deployment, data import) is in `docs/` if we need it later.
