/**
 * Google's forecast:lookup API only supports a window from the next hour
 * through ~96 hours ahead. Timestamps are rounded down to the previous
 * exact hour, so a start of "now + 5 minutes" still lands in the current
 * (already-started) hour and is rejected as an unsupported time period.
 *
 * See: https://developers.google.com/maps/documentation/air-quality/reference/rest/v1/forecast/lookup
 */

export const FORECAST_HORIZON_HOURS = 96;
const MS_PER_HOUR = 60 * 60 * 1000;

export function startOfUtcHour(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function nextUtcHour(date: Date): Date {
  return new Date(startOfUtcHour(date).getTime() + MS_PER_HOUR);
}

/**
 * Inclusive hour-aligned window that is safe to send to Google.
 * Start is the next UTC hour; end is 95 hours after the current hour
 * (strictly inside the 96-hour horizon even with clock skew).
 */
export function getUsableForecastWindow(now: Date): { start: Date; end: Date } {
  const start = nextUtcHour(now);
  const end = new Date(
    startOfUtcHour(now).getTime() + (FORECAST_HORIZON_HOURS - 1) * MS_PER_HOUR,
  );
  return { start, end };
}

/**
 * Last UTC calendar date that still has at least one hour inside the
 * usable Google window. `today + 4` calendar days can sit an hour past
 * usable.end just after UTC midnight (00:00–00:59Z).
 */
export function maxForecastUtcDate(now: Date = new Date()): string {
  return getUsableForecastWindow(now).end.toISOString().substring(0, 10);
}

/**
 * Clamp a requested [start, end] range to the usable Google forecast window.
 * Returns null when no hourly slot remains (e.g. "today only" late in the UTC day).
 */
export function clampToForecastWindow(
  requestedStart: Date,
  requestedEnd: Date,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  const { start: usableStart, end: usableEnd } = getUsableForecastWindow(now);

  const start =
    requestedStart < usableStart ? usableStart : startOfUtcHour(requestedStart);
  const end = requestedEnd > usableEnd ? usableEnd : startOfUtcHour(requestedEnd);

  if (end < start) {
    return null;
  }

  return { start, end };
}
