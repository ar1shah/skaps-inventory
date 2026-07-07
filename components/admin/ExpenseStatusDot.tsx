const EXPENSE_STATUS_META: Record<string, { label: string; dotClass: string }> = {
  expensed: { label: "Expensed out", dotClass: "bg-green-500" },
  not_expensed: { label: "Not expensed \u2013 needs review", dotClass: "bg-red-500" },
  check_inventory: { label: "Check inventory / stock balance", dotClass: "bg-yellow-400" },
  datatex_zero: { label: "Already 0 on Datatex", dotClass: "bg-pink-400" },
  testing: { label: "Test row \u2013 not a real expense status", dotClass: "bg-blue-500" },
};

interface Props {
  status: string | null;
}

/** Small colored dot mirroring the manual row-color convention used on the source sheet. */
export function ExpenseStatusDot({ status }: Props) {
  const meta = status ? EXPENSE_STATUS_META[status] : undefined;

  if (!meta) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5" title={meta.label}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClass}`} />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}
