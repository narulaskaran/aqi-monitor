export interface ParsedDateRange {
  startsAt?: Date;
  expiresAt?: Date;
}

interface DateRangeResult {
  dates?: ParsedDateRange;
  error?: string;
}

/**
 * Parses and validates the optional subscription date range.
 * Dates before today are rejected so the API enforces the same rules as the UI.
 */
export function parseDateRange(
  startsAt?: unknown,
  expiresAt?: unknown,
): DateRangeResult {
  const parsedStartsAt = parseDate(startsAt, "start");
  if (parsedStartsAt.error) return { error: parsedStartsAt.error };

  const parsedExpiresAt = parseDate(expiresAt, "end");
  if (parsedExpiresAt.error) return { error: parsedExpiresAt.error };

  const start = parsedStartsAt.date;
  const end = parsedExpiresAt.date;

  if (start && end && start >= end) {
    return { error: "Start date must be before end date" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start && start < today) {
    return { error: "Start date must be today or in the future" };
  }

  if (end && end < today) {
    return { error: "End date must be today or in the future" };
  }

  return {
    dates: {
      ...(start ? { startsAt: start } : {}),
      ...(end ? { expiresAt: end } : {}),
    },
  };
}

function parseDate(
  value: unknown,
  label: "start" | "end",
): { date?: Date; error?: string } {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  if (typeof value !== "string") {
    return { error: `Invalid ${label} date` };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { error: `Invalid ${label} date` };
  }

  return { date };
}
