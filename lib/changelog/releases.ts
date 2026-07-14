export type ChangeTag = "New" | "Improved" | "Fixed" | "Docs";

export type ChangeItem = {
  tag: ChangeTag;
  text: string;
};

export type Release = {
  date: string; // ISO date used for display formatting
  title: string;
  summary?: string;
  items: ChangeItem[];
};

// Curated from the project's commit history. Newest first.
export const releases: Release[] = [
  {
    date: "2026-07-14",
    title: "Admin table clarity & smarter inventory search",
    summary:
      "Cleaned up the parts-used and parts-request tables, gave urgency a proper grey/yellow/red scale, and made inventory search understand SKAPS # formatting differences.",
    items: [
      { tag: "Improved", text: "Removed the redundant Part column from the parts-used log." },
      {
        tag: "Improved",
        text: "SKAPS # is now the primary, bolded field on the parts-request table and edit form.",
      },
      { tag: "Improved", text: "Urgency badges now use a three-level grey / yellow / red scale." },
      {
        tag: "Fixed",
        text: "Inventory search now matches SKAPS #s regardless of spaces, underscores, or hyphens.",
      },
      { tag: "Improved", text: "Inventory search results rank the closest SKAPS # match first." },
      {
        tag: "Improved",
        text: "Sped up inventory search so typing no longer lags on the full parts list.",
      },
      { tag: "New", text: "Added a Changelog page to the admin dashboard." },
    ],
  },
  {
    date: "2026-07-07",
    title: "Parts-used log grouped by time period",
    summary:
      "The parts-used log can now be viewed broken down by week or by month, making it easier to spot usage trends over time.",
    items: [
      { tag: "New", text: "Group the parts-used log by weeks or months." },
      { tag: "Improved", text: "Reworked the submissions table for clearer, grouped totals." },
    ],
  },
  {
    date: "2026-07-06",
    title: "Expense status colors on the parts-used log",
    summary:
      "Rows in the parts-used log now show a color dot reflecting their expense status, synced automatically from the source spreadsheet.",
    items: [
      { tag: "New", text: "Color-coded expense status shown on each parts-used row." },
      { tag: "New", text: "Automatic status sync from the Google Sheet via a new endpoint." },
      { tag: "Fixed", text: "Correctly color rows that are still in a testing/pending state." },
    ],
  },
  {
    date: "2026-07-03",
    title: "Notes on parts requests",
    summary:
      "Admins can now leave notes on parts requests and remove requests that are no longer needed.",
    items: [
      { tag: "New", text: "Add and edit notes directly on the parts-request page." },
      { tag: "New", text: "Delete parts requests once they've been handled." },
    ],
  },
  {
    date: "2026-07-01",
    title: "Dashboard overhaul",
    summary:
      "The admin dashboard got a big refresh with several new reporting widgets and a dedicated view for yesterday's activity.",
    items: [
      { tag: "New", text: "\"Yesterday's report\" tab summarizing the previous day's usage." },
      { tag: "New", text: "Usage-by-line, PM-type breakdown, and top-consumers widgets." },
      { tag: "Improved", text: "Refreshed the weekly overview chart and consumed-today widget." },
    ],
  },
  {
    date: "2026-06-30",
    title: "Mobile support & sidebar navigation",
    summary:
      "The admin area is now usable on phones with a dedicated mobile navigation menu and a cleaner sidebar.",
    items: [
      { tag: "New", text: "Mobile navigation menu for the admin dashboard." },
      { tag: "Improved", text: "Reorganized the admin sidebar into a shared configuration." },
      { tag: "Docs", text: "Trimmed and tidied up the project README." },
    ],
  },
  {
    date: "2026-06-27",
    title: "Locked down public inventory access",
    summary: "Inventory data is now protected so it can only be read after signing in.",
    items: [
      { tag: "Fixed", text: "Restricted anonymous access to inventory at the database level." },
      { tag: "Improved", text: "Updated the home page to reflect sign-in-only inventory." },
    ],
  },
  {
    date: "2026-06-26",
    title: "Inventory made private",
    summary: "Browsing inventory now requires an admin sign-in instead of being publicly visible.",
    items: [
      { tag: "Improved", text: "Inventory pages now require authentication." },
      { tag: "Improved", text: "Cleaned up the public navigation and login redirects." },
    ],
  },
  {
    date: "2026-06-23",
    title: "Tile inventory & master list import",
    summary:
      "A major inventory upgrade: a visual tile layout, the full master parts list imported, and stock counts that update automatically from submissions.",
    items: [
      { tag: "New", text: "Tile-based inventory grid with a detailed part view." },
      { tag: "New", text: "Imported the complete master parts list." },
      { tag: "New", text: "Inventory quantities update automatically as parts are used." },
      { tag: "Improved", text: "Smarter SKAPS# matching that ignores case and separators." },
    ],
  },
  {
    date: "2026-06-17",
    title: "Parts in repair tracking",
    summary: "A new section for tracking parts that are out for repair, with its own dashboard widget.",
    items: [
      { tag: "New", text: "Parts-in-repair pages to add, list, and manage repair items." },
      { tag: "New", text: "Dashboard widget summarizing parts currently in repair." },
    ],
  },
  {
    date: "2026-06-11",
    title: "Authentication & data fixes",
    summary:
      "Several behind-the-scenes fixes to make admin invites and data handling more reliable.",
    items: [
      { tag: "Fixed", text: "Admin invite emails now complete the sign-in flow correctly." },
      { tag: "Fixed", text: "Corrected the order fields are mapped when importing form data." },
      { tag: "Docs", text: "Removed outdated setup documentation." },
    ],
  },
  {
    date: "2026-06-02",
    title: "Admin foundations",
    summary: "Set up the core database, security rules, and admin navigation structure.",
    items: [
      { tag: "New", text: "Section headers and improved layout for the admin sidebar." },
      { tag: "New", text: "Database tables, row-level security, and setup scripts." },
      { tag: "Fixed", text: "Resolved a build issue that blocked deployments." },
    ],
  },
  {
    date: "2026-05-26",
    title: "Initial launch",
    summary: "The first version of the SKAPS Parts Inventory app went live.",
    items: [
      { tag: "New", text: "Public site with home, inventory browse, and forms pages." },
      { tag: "New", text: "Admin dashboard with usage widgets and notifications." },
      { tag: "New", text: "Parts-used and parts-request forms syncing into the app." },
    ],
  },
];

export const tagTone: Record<ChangeTag, "accent" | "success" | "warning" | "neutral"> = {
  New: "success",
  Improved: "accent",
  Fixed: "warning",
  Docs: "neutral",
};

export function formatChangelogDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
