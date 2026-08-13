import { describe, it, expect } from "vitest";
import {
  startOfUtcHour,
  nextUtcHour,
  getUsableForecastWindow,
  clampToForecastWindow,
} from "../_lib/forecastWindow.js";

/** Production repro clock from issue #79 (2026-08-13 ~02:22 UTC). */
const REPRO_NOW = new Date("2026-08-13T02:22:00.000Z");

describe("forecast window helpers", () => {
  it("startOfUtcHour strips minutes, seconds, and milliseconds", () => {
    expect(startOfUtcHour(REPRO_NOW).toISOString()).toBe(
      "2026-08-13T02:00:00.000Z",
    );
  });

  it("nextUtcHour is the following hour boundary", () => {
    expect(nextUtcHour(REPRO_NOW).toISOString()).toBe(
      "2026-08-13T03:00:00.000Z",
    );
  });

  it("usable window starts at the next hour, not now+5min (the PR #74 pad)", () => {
    const { start, end } = getUsableForecastWindow(REPRO_NOW);

    expect(start.toISOString()).toBe("2026-08-13T03:00:00.000Z");
    // 5-minute pad would have produced 02:27, which Google rounds back to 02:00
    // (the current, already-started hour) and rejects.
    expect(start.getTime()).toBeGreaterThan(
      REPRO_NOW.getTime() + 5 * 60 * 1000,
    );
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);

    // Inclusive last hour stays inside currentHour + 96h (2026-08-17T02:00Z)
    expect(end.toISOString()).toBe("2026-08-17T01:00:00.000Z");
    expect(end.getTime()).toBeLessThan(
      startOfUtcHour(REPRO_NOW).getTime() + 96 * 60 * 60 * 1000,
    );
  });

  it("clamps a 'today through +2 days' request (issue #79 repro) onto the usable window", () => {
    const parsedStart = new Date("2026-08-13T00:00:00Z");
    const parsedEnd = new Date("2026-08-15T23:59:59Z");
    const clamped = clampToForecastWindow(parsedStart, parsedEnd, REPRO_NOW);

    expect(clamped).not.toBeNull();
    expect(clamped!.start.toISOString()).toBe("2026-08-13T03:00:00.000Z");
    expect(clamped!.end.toISOString()).toBe("2026-08-15T23:00:00.000Z");
  });

  it("clamps an end date past the 96-hour horizon to the last safe hour", () => {
    const parsedStart = new Date("2026-08-16T00:00:00Z");
    const parsedEnd = new Date("2026-08-17T23:59:59Z");
    const clamped = clampToForecastWindow(parsedStart, parsedEnd, REPRO_NOW);

    expect(clamped).not.toBeNull();
    expect(clamped!.start.toISOString()).toBe("2026-08-16T00:00:00.000Z");
    expect(clamped!.end.toISOString()).toBe("2026-08-17T01:00:00.000Z");
  });

  it("returns null when the requested range has no remaining forecast hours", () => {
    const lateEvening = new Date("2026-08-13T23:50:00.000Z");
    const parsedStart = new Date("2026-08-13T00:00:00Z");
    const parsedEnd = new Date("2026-08-13T23:59:59Z");
    const clamped = clampToForecastWindow(
      parsedStart,
      parsedEnd,
      lateEvening,
    );

    expect(clamped).toBeNull();
  });

  it("leaves a fully-future in-horizon range on hour boundaries", () => {
    const parsedStart = new Date("2026-08-14T00:00:00Z");
    const parsedEnd = new Date("2026-08-16T23:59:59Z");
    const clamped = clampToForecastWindow(parsedStart, parsedEnd, REPRO_NOW);

    expect(clamped).not.toBeNull();
    expect(clamped!.start.toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(clamped!.end.toISOString()).toBe("2026-08-16T23:00:00.000Z");
  });
});
