-- Expense status is set manually by staff by coloring the row on the
-- source Google Sheet (green/red/yellow/pink). The Apps Script color-sync
-- job (docs/apps-script/ColorSync.gs) reads that color and reports it here
-- via /api/sync-expense-status, matched by external_row_id. Null means the
-- row hasn't been colored yet.
alter table public.submissions
  add column expense_status text
  check (expense_status in (
    'expensed', 'not_expensed', 'check_inventory', 'datatex_zero'
  ));
