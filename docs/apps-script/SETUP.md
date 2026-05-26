# Google Apps Script setup

Step-by-step instructions for wiring the existing
`Maintenance Parts Requests (Responses)` Google Sheet up to the
`/api/ingest` endpoint of this app. You only have to do this once.

## What this gives you

Every time someone submits the Google Form, a new row appears in the
sheet. The Apps Script trigger you're about to install will fire on
that event and POST the row to our Next.js API, which writes it to
Supabase. From there it shows up in the dashboard widgets and in the
public inventory page.

## Prerequisites

- The app is deployed (or you have a public URL via `vercel dev --tunnel`).
- You know the value of the `INGEST_SECRET` environment variable from
  the Vercel project settings. If you don't have one yet, generate a
  long random string -- e.g. by running this in any terminal:

  ```sh
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

  Add it to Vercel as `INGEST_SECRET` and keep a copy handy for step 4
  below.

## Steps

### 1. Open the Apps Script editor

- Open the Google Sheet (the one named "Maintenance Parts Requests
  (Responses)").
- In the top menu click **Extensions -> Apps Script**.
- A new tab opens with the script editor. There's a default
  `Code.gs` file with one empty function.

### 2. Paste in the trigger script

- Select everything in `Code.gs` and delete it.
- Open `docs/apps-script/Code.gs` from this repo, copy the entire file,
  and paste it into the Apps Script `Code.gs` panel.

### 3. Configure the two constants at the top

- Change the value of `ENDPOINT` to point at your deployment, for
  example:

  ```js
  var ENDPOINT = 'https://skaps-inventory.vercel.app/api/ingest';
  ```

- Change `SHARED_SECRET` to match the value of `INGEST_SECRET` on
  Vercel.

### 4. Save and name the project

- Click the disk icon (or `Ctrl+S`).
- The first time you save, Apps Script will prompt for a project name.
  Use **SKAPS Ingest**.

### 5. Add the on-form-submit trigger

- In the left sidebar click the clock icon (**Triggers**).
- Click **+ Add Trigger** (bottom right).
- Configure the trigger as follows:
  - Function to run: **onFormSubmitTrigger**
  - Deployment: **Head**
  - Event source: **From spreadsheet**
  - Event type: **On form submit**
  - Failure notifications: **Notify me immediately** (your choice)
- Click **Save**.
- Google will prompt you to grant the script permission to read the
  sheet and call external URLs. Click **Allow**. (Apps Script will warn
  that the project is "unverified" because it's a personal script --
  that's expected.)

### 6. Test it

- Back in the script editor, change the `DEBUG` constant to `true`.
- In the function dropdown at the top, select **manualTest** and click
  **Run**.
- Open **Executions** in the left sidebar. The most recent execution
  should be green. Click it to see the payload that was posted.
- Open your Supabase dashboard and check the `submissions` table -- the
  re-sent row should be there. Because the script uses a stable
  `external_row_id`, running this test multiple times only updates the
  one row.
- Set `DEBUG` back to `false` and save.

### 7. Submit a real form entry

Submit a test entry through the actual Google Form. Within a few
seconds:

- The row appears in the sheet.
- The trigger fires.
- The row appears in Supabase.
- It shows up in the admin dashboard at `/admin`.

## Troubleshooting

- **Trigger fires but ingest endpoint returns 401.** The
  `SHARED_SECRET` doesn't match `INGEST_SECRET`. Double-check both.
- **Trigger fires but ingest returns "unmappable row".** The form has
  probably grown a new column we don't recognize. Open
  `lib/forms/mapping.ts` and add a hint to `COLUMN_HINTS`.
- **Trigger doesn't fire at all.** Open Triggers, confirm the trigger
  exists and is enabled. The first form submission after creating the
  trigger sometimes lags by ~30 seconds while Google sets it up.

## Rotating the secret

To rotate `INGEST_SECRET`:

1. Generate a new value.
2. Update it on Vercel (Project Settings -> Environment Variables).
3. Redeploy so the new value takes effect.
4. Update `SHARED_SECRET` in the Apps Script, then **Save**.

(You can also do this in the opposite order; there will just be a
short window where ingest fails.)
