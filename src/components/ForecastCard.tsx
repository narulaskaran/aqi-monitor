import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { getAirQualityForecast } from "../lib/api";
import { getAQIColor } from "../lib/utils";
import { DailyForecast } from "../types/forecast";

interface ForecastCardProps {
  zipCode: string;
}

/**
 * Formats a YYYY-MM-DD string as "Mon, Jun 12" using UTC to avoid timezone shifts.
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Returns today's date as YYYY-MM-DD in UTC.
 */
function todayUTC(): string {
  return new Date().toISOString().substring(0, 10);
}

/**
 * Returns today + n days as YYYY-MM-DD in UTC.
 */
function offsetDaysUTC(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

export function ForecastCard({ zipCode }: ForecastCardProps) {
  const today = todayUTC();
  const maxDate = offsetDaysUTC(4);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<DailyForecast[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForecasts(null);
    setIsLoading(true);

    try {
      const result = await getAirQualityForecast(
        zipCode,
        startDate,
        endDate || undefined,
      );
      setForecasts(result.forecasts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch forecast data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Air Quality Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2 items-center">
            <label
              htmlFor="forecast-start-date"
              className="text-sm font-medium w-20 shrink-0 dark:text-gray-300"
            >
              Start date
            </label>
            <Input
              id="forecast-start-date"
              type="date"
              value={startDate}
              min={today}
              max={maxDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1"
              required
            />
          </div>
          <div className="flex gap-2 items-center">
            <label
              htmlFor="forecast-end-date"
              className="text-sm font-medium w-20 shrink-0 dark:text-gray-300"
            >
              End date
            </label>
            <Input
              id="forecast-end-date"
              type="date"
              value={endDate}
              min={startDate || today}
              max={maxDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1"
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={isLoading || !startDate}>
            {isLoading ? "Loading…" : "Get Forecast"}
          </Button>
        </form>

        {error && (
          <div className="mt-3 text-red-500 text-sm" role="alert">
            {error}
          </div>
        )}

        {forecasts !== null && forecasts.length === 0 && (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No forecast data available for the selected dates.
          </div>
        )}

        {forecasts && forecasts.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {forecasts.map((day) => (
              <div
                key={day.date}
                className={`flex items-center justify-between rounded-md px-3 py-2 ${getAQIColor(day.maxAqi)}`}
              >
                <span className="text-sm font-medium text-gray-800">
                  {formatDate(day.date)}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-800">
                    AQI {day.maxAqi}
                  </span>
                  <span className="ml-2 text-xs text-gray-700">
                    {day.category}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              * These are projections only. Forecasts show the worst-case AQI per day and may change as conditions evolve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
