export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
        <p>
          SKAPS Maintenance Parts Inventory &middot; built for the maintenance team.
        </p>
        <p>&copy; {new Date().getFullYear()} SKAPS</p>
      </div>
    </footer>
  );
}
