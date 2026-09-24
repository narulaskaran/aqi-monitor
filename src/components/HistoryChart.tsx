import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getAQICategory } from "../types/air-quality";
import { getAirQualityHistory } from "../lib/api";
import type { HistoryPoint } from "../lib/api";

interface HistoryChartProps {
  zipCode: string;
  days?: number;
}

/**
 * Returns an AQI band color (hex) for a given AQI value.
 * Matches the EPA AQI color scale.
 */
function aqiColorHex(aqi: number): string {
  return getAQICategory("", aqi).color;
}

/**
 * Formats an ISO timestamp to a short date label like "Mon 6/20".
 * Uses UTC to avoid timezone shifts.
 */
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 104;
const PADDING = { top: 8, bottom: 24, left: 34, right: 10 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export function HistoryChart({ zipCode, days = 7 }: HistoryChartProps) {
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zipCode) return;

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getAirQualityHistory(zipCode, days, controller.signal)
      .then((result) => {
        if (!cancelled) {
          setHistory(result.history);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [zipCode, days]);

  // Hide the trend area until there are six distinct calendar days of readings.
  // Multiple snapshots from one day count as one day of coverage.
  if (isLoading || error || !history) {
    return null;
  }

  const datedHistory = history.filter((point) => Number.isFinite(Date.parse(point.timestamp)));
  const coveredDays = new Set(
    datedHistory.map((point) => new Date(point.timestamp).toISOString().slice(0, 10)),
  );
  if (coveredDays.size < 6 || datedHistory.length < 2) return null;

  const aqiValues = datedHistory.map((h) => h.aqi);
  const minAqi = Math.min(...aqiValues);
  const maxAqi = Math.max(...aqiValues);
  const axisMin = Math.max(0, Math.floor(minAqi / 25) * 25);
  const axisMax = Math.max(axisMin + 25, Math.ceil(maxAqi / 25) * 25);
  const range = axisMax - axisMin;

  const times = datedHistory.map((h) => new Date(h.timestamp).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const tRange = Math.max(maxT - minT, 1);

  const points = datedHistory.map((h) => {
    const t = new Date(h.timestamp).getTime();
    const x = PADDING.left + ((t - minT) / tRange) * PLOT_W;
    const y = PADDING.top + PLOT_H - ((h.aqi - axisMin) / range) * PLOT_H;
    return { x, y, aqi: h.aqi, category: h.category, timestamp: h.timestamp };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Area fill path — closes down to the bottom
  const last = points[points.length - 1];
  const first = points[0];
  const areaD = `${pathD} L${last.x.toFixed(1)},${PADDING.top + PLOT_H} L${first.x.toFixed(1)},${PADDING.top + PLOT_H} Z`;

  // Gradient stops: color the fill by the last data point's AQI band
  const fillColor = aqiColorHex(aqiValues[aqiValues.length - 1]);
  const yTicks = [...new Set([axisMin, Math.round((axisMin + axisMax) / 2), axisMax])];
  const accessibleSeries = points
    .map((point) => `${formatShortDate(point.timestamp)}: AQI ${point.aqi}`)
    .join("; ");

  return (
    <Card className="aqi-chart mt-3">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm">Last {days} days AQI trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="aqi-history-svg w-full h-auto"
            role="img"
            aria-label={`Air Quality Index trend chart; values ranged from ${minAqi} to ${maxAqi}`}
          >
            <desc>Daily readings: {accessibleSeries}.</desc>
            <defs>
              <linearGradient id={`aqi-fill-${zipCode}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <g aria-hidden="true">
              {yTicks.map((value) => {
                const y = PADDING.top + PLOT_H - ((value - axisMin) / range) * PLOT_H;
                return (
                  <g key={value}>
                    <line
                      x1={PADDING.left}
                      x2={CHART_WIDTH - PADDING.right}
                      y1={y}
                      y2={y}
                      className="aqi-chart-gridline"
                    />
                    <text x={PADDING.left - 6} y={y + 3} textAnchor="end" className="aqi-chart-label">
                      {value}
                    </text>
                  </g>
                );
              })}
            </g>
            {/* Area fill */}
            <path d={areaD} fill={`url(#aqi-fill-${zipCode})`} />
            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke="var(--aqi-trend-line)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill={aqiColorHex(p.aqi)}
                stroke="var(--aqi-trend-point-outline)"
                strokeWidth="1"
              >
                <title>{`${p.category}: AQI ${p.aqi} (${formatShortDate(p.timestamp)})`}</title>
              </circle>
            ))}
            {/* X-axis labels — show first, middle, last (deduplicated for small datasets) */}
            {[...new Set([0, Math.floor(points.length / 2), points.length - 1])].map((idx) => (
              <text
                key={idx}
                x={Math.max(PADDING.left + 27, Math.min(points[idx].x, CHART_WIDTH - PADDING.right - 21))}
                y={CHART_HEIGHT - 3}
                textAnchor="middle"
                className="aqi-chart-label"
                fontSize="10"
              >
                {datedHistory[idx] ? formatShortDate(datedHistory[idx].timestamp) : ""}
              </text>
            ))}
          </svg>
        </div>
        <p className="aqi-chart-caption">Historical AQI snapshots · scale {axisMin}–{axisMax}</p>
      </CardContent>
    </Card>
  );
}
