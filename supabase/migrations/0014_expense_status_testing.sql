-- Staff use a blue row color to flag test/practice submissions on the
-- source sheet (not a real expense status). Add 'testing' as a valid
-- expense_status value so the color sync + UI can represent it.
alter table public.submissions
  drop constraint if exists submissions_expense_status_check;

alter table public.submissions
  add constraint submissions_expense_status_check
  check (expense_status in (
    'expensed', 'not_expensed', 'check_inventory', 'datatex_zero', 'testing'
  ));
