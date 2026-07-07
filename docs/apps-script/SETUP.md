# Form Response Apps Script Setup

This guide covers the Apps Script project bound to the **Maintenance Parts
Requests (Responses)** Google Sheet. It handles two things:

1. **Ingest** (`Code.gs`) -- sends every new form submission to
   `/api/ingest`, which writes it to Supabase.
2. **Color sync** (`ColorSync.gs`) -- watches the manually-applied row
   colors (green / red / yellow / pink) and sends the expense status to
   `/api/sync-expense-status`, which the Parts Used log displays as a
   colored dot.

Both files live in the **same** Apps Script project -- a spreadsheet can
only have one bound project, so this is not a separate script.

---

## Step 0 -- Rotate the shared secret

The secret previously used in this script was pasted in plain text into a
local file. Treat it as compromised:

1. In Vercel, generate a new random value and set it as `INGEST_SECRET`
   (replacing the old one), then redeploy.
2. Use that same new value for `SHARED_SECRET` in Step 2 below.

---

## Step 1 -- Open the Apps Script editor

1. Open the **Maintenance Parts Requests (Responses)** Google Sheet.
2. **Extensions -> Apps Script**.

---

## Step 2 -- Set Script Properties

**Project Settings (gear icon) -> Script Properties -> Add script property**:

| Property name     | Value |
|-------------------|-------|
| `ENDPOINT`        | `https://skaps-inventory.vercel.app/api/ingest` |
| `STATUS_ENDPOINT` | `https://skaps-inventory.vercel.app/api/sync-expense-status` |
| `SHARED_SECRET`   | The new value you set as `INGEST_SECRET` on Vercel |
| `DEBUG`           | `false` (set to `true` temporarily for verbose logs) |

`SHARED_SECRET` and `DEBUG` are shared by both scripts -- you only need to
set each once.

---

## Step 3 -- Paste the scripts

1. Make sure the editor has a file named **Code.gs** -- replace its
   contents with `docs/apps-script/Code.gs` from this repository.
2. Add a new file (**+** next to Files) named **ColorSync** and paste in
   `docs/apps-script/ColorSync.gs`.
3. Save (`Ctrl+S` / `Cmd+S`).

---

## Step 4 -- Calibrate the color map

The exact hex codes for "green", "red", "yellow", and "pink" depend on
which swatches were used in the sheet's fill-color picker, so they need to
be confirmed against the live sheet before color sync is trustworthy.

1. In the function dropdown, select **`logDistinctRowColors`** and click
   **Run**.
2. Authorize the script if prompted.
3. Open **View -> Logs** (or the Executions panel). You'll see every
   distinct fill color in use, e.g.:

   ```
   00FF00  (x412, e.g. row 88)
   FF0000  (x203, e.g. row 91)
   ```

4. Open `ColorSync.gs` and check each hex code against `COLOR_MAP`. If a
   code isn't listed (or maps to the wrong status), edit the map, e.g.:

   ```javascript
   var COLOR_MAP = {
     '00FF00': 'expensed',
     'FF0000': 'not_expensed',
     // ...
   };
   ```

5. Save and re-run `logDistinctRowColors` if you're unsure -- it's
   read-only and safe to run as many times as you like.

---

## Step 5 -- Backfill existing colored rows

Once the color map is correct, run **`backfillAllRowColors`** once from the
function dropdown. This scans every row and syncs any that are already
colored. On a large sheet (thousands of rows) this can take a few minutes
-- let it finish, and consider running it outside business hours.

---

## Step 6 -- Install triggers

**Triggers (clock icon) -> + Add Trigger**, add each of these:

| Function | Deployment | Event source | Event type | Notes |
|----------|------------|---------------|------------|-------|
| `onFormSubmitTrigger` | Head | From spreadsheet | On form submit | Should already exist -- verify it's still there |
| `onSheetFormatChange` | Head | From spreadsheet | On change | Fires when a row's fill color is edited |
| `syncRecentRowColors` | Head | Time-driven | Minutes timer, every 30 minutes | Safety net in case a color change is missed |

Authorize when prompted. If you see duplicate or stale triggers from
before, delete them (three-dot menu next to the trigger).

---

## Step 7 -- Verify

1. Run **`manualTest`** -- confirms ingest still works end to end.
2. Color a test row on the sheet. Within about a minute the dot should
   appear on that submission in the Parts Used log; if not, wait for the
   next 30-minute timer run.
3. Check the Parts Used log: rows flagged "Needs review" should show the
   badge but keep the normal row background (no more amber tint).

---

## Recovering rows that failed to sync

If a form submission fails (see Troubleshooting below), the row still
exists in the sheet but never reached Supabase. Recover it with:

```javascript
resyncRow(482); // the sheet row number
```

Run this from the Apps Script editor (Code.gs). It's safe to re-run --
the ingest endpoint upserts on the row's ID, so this never creates a
duplicate.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `ENDPOINT is not set` / `STATUS_ENDPOINT is not set` in logs | Script property not saved | Re-check Step 2 |
| HTTP 401 in logs | `SHARED_SECRET` doesn't match `INGEST_SECRET` on Vercel | Match it exactly |
| "The JavaScript runtime exited unexpectedly" in Executions | Transient Google Apps Script platform crash | Usually self-resolves; check for gaps and use `resyncRow()` if a submission is missing |
| Row colored but no dot appears in the app | Color not yet mapped, or timer hasn't run yet | Run `logDistinctRowColors` to check the hex code is in `COLOR_MAP`; wait for the 30-minute timer or manually run `syncRecentRowColors` |
| Dot shows wrong status | Wrong hex mapped in `COLOR_MAP` | Re-run `logDistinctRowColors`, fix the map, re-run `backfillAllRowColors` |

---

## How data flows in

```
Form submitted
      |
onFormSubmitTrigger fires
      |
POST /api/ingest (x-skaps-secret header)
      |
Supabase submissions table upserted
      |
Appears in Parts Used / Parts Request log

Row colored manually
      |
onSheetFormatChange fires (or syncRecentRowColors on its 30-min timer)
      |
POST /api/sync-expense-status (x-skaps-secret header)
      |
Supabase submissions.expense_status updated
      |
Colored dot appears next to the row in the Parts Used log
```
