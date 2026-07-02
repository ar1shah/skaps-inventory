/**
 * Date helpers used by the dashboard widgets. We always want "today" to
 * mean local-time midnight to local-time midnight, not a rolling 24-hour
 * window -- the team thinks in shifts/days, not hours.
 *
 * "Local" here means the SKAPS plant's timezone, not the server's. The app
 * is hosted on Vercel (server clock is UTC), but the maintenance team is in
 * the US Eastern timezone, so we anchor all day boundaries to that zone
 * explicitly instead of relying on `Date#setHours`, which uses whatever
 * timezone the Node process happens to be running in.
 */

export const BUSINESS_TIMEZONE = "America/New_York";

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Breaks an instant down into the calendar/clock fields it shows as inside `timeZone`. */
function partsInZone(instant: Date, timeZone: string): ZonedParts {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const part of formatted) map[part.type] = part.value;

  return {
    year: Number(map.year),
    // Some ICU implementations report midnight as "24" instead of "00".
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Finds the UTC instant that corresponds to local midnight (00:00:00) on
 * the given calendar date inside `timeZone`. Handles DST transitions by
 * measuring how far a first guess drifts from midnight and correcting for
 * it -- two passes is always enough since no timezone shifts by more than
 * a day between passes.
 */
function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string): Date {
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);

  for (let i = 0; i < 2; i++) {
    const z = partsInZone(new Date(guess), timeZone);
    const guessedWallClock = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
    const drift = target - guessedWallClock;
    if (drift === 0) break;
    guess += drift;
  }

  return new Date(guess);
}

/** Start of the business day (local midnight in `BUSINESS_TIMEZONE`) containing `date`. */
export function startOfBusinessDay(date: Date = new Date(), timeZone: string = BUSINESS_TIMEZONE): Date {
  const { year, month, day } = partsInZone(date, timeZone);
  return zonedMidnightToUtc(year, month, day, timeZone);
}

/**
 * Start of the business day `offsetDays` away from today (0 = today,
 * -1 = yesterday, -6 = six days ago, etc). Shifts by calendar days rather
 * than a fixed number of hours so results stay correct across DST changes.
 */
export function startOfBusinessDayOffset(
  offsetDays: number,
  timeZone: string = BUSINESS_TIMEZONE,
): Date {
  const todayMidnight = startOfBusinessDay(new Date(), timeZone);
  const approx = new Date(todayMidnight);
  approx.setUTCDate(approx.getUTCDate() + offsetDays);

  // `approx` may be off by an hour around a DST boundary. Re-derive the
  // calendar date it lands on and re-anchor to that date's exact midnight.
  const { year, month, day } = partsInZone(approx, timeZone);
  return zonedMidnightToUtc(year, month, day, timeZone);
}

export interface DayRange {
  /** ISO timestamp at business-timezone 00:00 of the chosen day */
  start: string;
  /** ISO timestamp at business-timezone 00:00 of the *next* day (exclusive end) */
  end: string;
}

export function dayRange(offsetDays = 0): DayRange {
  return {
    start: startOfBusinessDayOffset(offsetDays).toISOString(),
    end: startOfBusinessDayOffset(offsetDays + 1).toISOString(),
  };
}
