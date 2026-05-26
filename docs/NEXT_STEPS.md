# Next steps

The code is in shape and Supabase is provisioned. Here's what's left to
do to take this from "builds locally" to "live and ingesting".

## 1. Set the service role key locally

Open the Supabase dashboard, copy the `service_role` key from
**Project Settings -> API**, and paste it into `.env.local` as
`SUPABASE_SERVICE_ROLE_KEY=...`. Without it, `/api/ingest` and the
seed scripts will refuse to run.

The Supabase MCP only exposes the publishable (anon) key, which is
why this one step is manual.

## 2. Generate an INGEST_SECRET

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the output into `.env.local` as `INGEST_SECRET=...`. Use the
same value on Vercel and inside the Apps Script.

## 3. Create the first admin

```sh
pnpm tsx supabase/seed/create_admin.ts admin@skaps.com 'a-strong-password' First Last
```

Replace the values with your friend's actual email/name. The script
uses the service role key from your `.env.local` to create the
account, marks it as email-verified, and populates the matching
`profiles` row via the `handle_new_user` trigger.

You can now sign in at `http://localhost:3000/login`.

## 4. Deploy to Vercel

The easiest path:

1. Push this repo to GitHub.
2. In Vercel, click **Add New -> Project** and import the repo.
3. In **Settings -> Environment Variables**, add every variable from
   `.env.local` (yes including the service role key and the
   `INGEST_SECRET`).
4. Click Deploy.
5. Note the production URL -- you'll need it for the next step.

If you'd rather deploy from the CLI:

```sh
pnpm dlx vercel link
pnpm dlx vercel env pull .env.local
pnpm dlx vercel --prod
```

## 5. Wire up the Google Apps Script

Follow `docs/apps-script/SETUP.md` -- the only values you'll need to
fill in there are:

- `ENDPOINT = 'https://<your-vercel-domain>/api/ingest'`
- `SHARED_SECRET = '<the same INGEST_SECRET from step 2>'`

After this is set up, the next form submission will appear in
Supabase within a few seconds and immediately show on the dashboard.

## 6. (Optional) Backfill historical data

If you want the 14k+ historical rows from the existing Google Sheet
visible in the admin logs and charts:

```sh
pnpm import:historical "C:\Users\AriSh\Downloads\Copy of Maintenance Parts Reqests (Responses).xlsx"
```

This is idempotent thanks to the stable `external_row_id` of every
row, so you can re-run it safely.

## 7. Add some real parts

Sign in, head to `/admin/inventory`, and click **Add part**. Type in
a SKAPS number that matches one you saw in the historical data --
the public `/inventory` page will pick it up on next refresh, and
any future "used" submissions referencing that SKAPS number will
automatically decrement the on-hand count.
