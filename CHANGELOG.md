# Changelog

All notable changes to this project are documented here. Format follows
the spirit of [Keep a Changelog](https://keepachangelog.com/) without
being too rigid about it.

## [Unreleased]

### Added

- Initial cut of the public site: home, inventory browse, and forms page.
- Admin dashboard with welcome header, consumed-today / yesterday widgets,
  weekly chart, notifications panel, quick form links, and placeholders
  for the future delivered/in-transit widgets.
- Admin pages for the parts-used log, parts-request log, inventory
  management (with add/edit/delete), notifications inbox, and settings.
- `/api/ingest` Route Handler that accepts Google Apps Script payloads,
  maps them through the bilingual form mapping layer, and upserts into
  Supabase.
- Database migrations for `parts`, `submissions`, `profiles`,
  `notifications`, the `apply_used_submission` trigger, and the
  `public_inventory` view -- all with RLS.
- One-off CLI scripts: create the first admin, import historical xlsx.
- Apps Script source + setup walkthrough under `docs/apps-script/`.

### Deferred

- Parts-delivered / in-transit tracking. The submissions table already
  has `status`, `po_number`, and `received_at`, but the UI is just a
  "Coming soon" placeholder for now.
