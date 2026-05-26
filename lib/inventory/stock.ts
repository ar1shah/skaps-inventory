/**
 * Date helpers used by the dashboard widgets. We always want "today" to
 * mean local-time midnight to local-time midnight, not a rolling 24-hour
 * window -- the team thinks in shifts/days, not hours.
 */

export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfLocalDayOffset(offsetDays: number): Date {
  const d = startOfLocalDay();
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export interface DayRange {
  /** ISO timestamp at local 00:00 of the chosen day */
  start: string;
  /** ISO timestamp at local 00:00 of the *next* day (exclusive end) */
  end: string;
}

export function dayRange(offsetDays = 0): DayRange {
  return {
    start: startOfLocalDayOffset(offsetDays).toISOString(),
    end: startOfLocalDayOffset(offsetDays + 1).toISOString(),
  };
}
