# SKAPS Parts Inventory

Internal tool for the SKAPS maintenance team. Tracks parts on the shelf,
ingests the team's existing Google Form submissions, and gives admins
an analytics dashboard.

The maintenance crew still uses the same two Google Forms they always
have ("parts used" and "parts request"). A Google Apps Script trigger
on the responses sheet POSTs each new row to this app, which writes it
to Supabase. The dashboard reads from there.

## Stack

- **Next.js 15** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** and a small handful of **shadcn/ui**-style components
- **Supabase** (Postgres + email/password auth + row-level security)
- **Recharts** for the weekly chart
- Hosted on **Vercel** + **Supabase Cloud** -- both free tier

## Architecture

```mermaid
flowchart LR
  emp[Employee] -->|fills out| gform[Google Form]
  gform -->|response row| gsheet[Google Sheet]
  gsheet -->|onFormSubmit| gas[Apps Script]
  gas -->|POST + x-skaps-secret| api[/api/ingest]
  api -->|service role| sb[(Supabase)]
  pub[Public visitor] --> nextpub[Public pages]
  nextpub -->|anon key + RLS| sb
  admin[Admin] -->|email/password| login[/login]
  login --> dash[Admin dashboard]
  dash -->|authed| sb
```

## Pages

| Path                    | Who         | What                                           |
| ----------------------- | ----------- | ---------------------------------------------- |
| `/`                     | public      | Hero + summary stats + CTAs                    |
| `/inventory`            | public      | Stock table with search + filters              |
| `/forms`                | public      | Two CTAs that open the Google Forms            |
| `/login`                | public      | Email/password sign in                         |
| `/admin`                | admin       | Dashboard overview with widgets                |
| `/admin/used`           | admin       | Parts-used submissions log (search, CSV)       |
| `/admin/requests`       | admin       | Parts-request submissions log (search, CSV)    |
| `/admin/inventory`      | admin       | Manage the master parts list (add/edit/delete) |
| `/admin/notifications`  | admin       | Full notifications inbox                       |
| `/admin/delivered`      | admin       | Placeholder for the future tracking workflow   |
| `/admin/settings`       | admin       | Profile, password, invite admins               |
| `/api/ingest`           | Apps Script | Receives new form rows over HTTPS              |

## Data model

Two tables drive everything:

- `parts` -- admin-curated master list. Starts empty; admin adds rows
  from `/admin/inventory`. When a "used" submission comes in, the
  database trigger `apply_used_submission` decrements
  `current_quantity` (floored at zero).
- `submissions` -- one row per Google Form response. The `form_type`
  column distinguishes "used" from "request".

Two supporting tables:

- `profiles` -- mirrors `auth.users` and stores first/last name for the
  "Welcome back, ..." header.
- `notifications` -- in-app feed (new request, urgent request, low
  stock, unknown SKAPS #).

One view:

- `public_inventory` -- joins the above and is readable by the `anon`
  role. Wraps `current_quantity` in `greatest(..., 0)` so the public
  table can never show negative stock.

All four tables enable RLS. The public-facing pages use the anon key
through the view; admin writes use the service role from server
actions.

## Local setup

1. Clone and install:

   ```sh
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL` -- from your Supabase project dashboard
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- the publishable key from the
     same place
   - `SUPABASE_SERVICE_ROLE_KEY` -- only used server-side
   - `INGEST_SECRET` -- generate something like
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `NEXT_PUBLIC_GFORM_USED_URL` and `NEXT_PUBLIC_GFORM_REQUEST_URL` --
     the public URLs of the two Google Forms

3. Apply the migrations in `supabase/migrations/` via the Supabase CLI
   or by pasting them into the SQL editor. Order matters
   (`0001_init.sql` first).

4. Create the first admin:

   ```sh
   pnpm tsx supabase/seed/create_admin.ts \
     you@example.com 'somePassword' First Last
   ```

5. Start the dev server:

   ```sh
   pnpm dev
   ```

   Visit `http://localhost:3000`. Sign in at `/login` and you should
   land on the dashboard.

## Wiring up the Google Form

See `docs/apps-script/SETUP.md` for the exact step-by-step. Short
version: paste `docs/apps-script/Code.gs` into the response sheet's
Apps Script editor, fill in the endpoint URL + the matching
`INGEST_SECRET`, and add an "On form submit" trigger.

## Importing historical data (optional)

If you want to backfill the existing Google Sheet history into
Supabase:

```sh
pnpm import:historical "path/to/Copy of Maintenance Parts Reqests (Responses).xlsx"
```

The script reuses the same `mapRowToSubmission()` function the live
ingest endpoint uses, and upserts under stable
`historical-<sheet>-<row>` IDs so re-runs are safe.

## Deployment

This repo is set up to deploy as-is on Vercel:

1. Import the GitHub repo into Vercel.
2. Add all the env vars from `.env.example` in
   **Project Settings -> Environment Variables**.
3. Click Deploy.
4. Update the `ENDPOINT` constant in the Apps Script to point at the
   new Vercel URL.

## Scripts

| Script                  | What it does                            |
| ----------------------- | --------------------------------------- |
| `pnpm dev`              | Next.js dev server (Turbopack)          |
| `pnpm build`            | Production build                        |
| `pnpm start`            | Run the production build                |
| `pnpm typecheck`        | `tsc --noEmit`                          |
| `pnpm lint`             | `next lint`                             |
| `pnpm format`           | Run Prettier across the repo            |
| `pnpm import:historical`| One-off xlsx -> Supabase import script  |

## License

[MIT](./LICENSE)
