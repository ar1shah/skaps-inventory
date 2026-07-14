import { Badge } from "@/components/ui/badge";
import { formatChangelogDate, tagTone, type Release } from "@/lib/changelog/releases";

export function ChangelogTimeline({ releases }: { releases: Release[] }) {
  return (
    <ol className="space-y-10 border-l border-slate-200 pl-6 sm:pl-8">
      {releases.map((release) => (
        <li key={release.date} className="relative">
          <span
            aria-hidden
            className="absolute -left-[calc(1.5rem+7px)] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-blue-600 sm:-left-[calc(2rem+7px)]"
          />

          <time
            dateTime={release.date}
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            {formatChangelogDate(release.date)}
          </time>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{release.title}</h2>
          {release.summary ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{release.summary}</p>
          ) : null}

          <ul className="mt-4 space-y-2">
            {release.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <Badge tone={tagTone[item.tag]} className="mt-0.5 shrink-0">
                  {item.tag}
                </Badge>
                <span className="text-sm text-slate-700">{item.text}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
