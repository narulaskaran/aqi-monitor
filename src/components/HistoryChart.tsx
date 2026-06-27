import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getAirQualityHistory, HistoryPoint } from "../lib/api";

interface HistoryChartProps {
  zipCode: string;
}

/**
 * Returns an AQI band color (hex) for a given AQI value.
 * Matches the EPA AQI color scale.
 */
function aqiColorHex(aqi: number): string {
  if (aqi <= 50) return "#00E400";
  if (aqi <= 100) return "#FFFF00";
  if (aqi <= 150) return "#FF7E00";
  if (aqi <= 200) return "#FF0000";
  if (aqi <= 300) return "#99004C";
  return "#7E0023";
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

const CHART_WIDTH = 280;
const CHART_HEIGHT = 70;
const PADDING = { top: 4, bottom: 16, left: 4, right: 4 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export function HistoryChart({ zipCode }: HistoryChartProps) {
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zipCode) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAirQualityHistory(zipCode, 7)
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
    };
  }, [zipCode]);

  // Don't render anything when: loading, error, or fewer than 2 data points
  if (isLoading || error || !history || history.length < 2) {
    return null;
  }

  const aqiValues = history.map((h) => h.aqi);
  const minAqi = Math.min(...aqiValues);
  const maxAqi = Math.max(...aqiValues);
  const range = Math.max(maxAqi - minAqi, 1);

  const points = history.map((h, i) => {
    const x = PADDING.left + (i / Math.max(history.length - 1, 1)) * PLOT_W;
    const y = PADDING.top + PLOT_H - ((h.aqi - minAqi) / range) * PLOT_H;
    return { x, y, aqi: h.aqi, category: h.category, timestamp: h.timestamp };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Area fill path — closes down to the bottom
  const last = points[points.length - 1];
  const first = points[0];
  const areaD = `${pathD} L${last.x.toFixed(1)},${PADDING.top + PLOT_H} L${first.x.toFixed(1)},${PADDING.top + PLOT_H} Z`;

  // Gradient stops: color the fill by the last data point's AQI band
  const fillColor = aqiColorHex(aqiValues[aqiValues.length - 1]);

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm">Last 7 Days AQI Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full max-w-[280px] h-auto"
            role="img"
            aria-label="Air Quality Index trend chart"
          >
            <defs>
              <linearGradient id="aqi-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={areaD} fill="url(#aqi-fill)" />
            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke={fillColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2"
                fill={aqiColorHex(p.aqi)}
                stroke="#fff"
                strokeWidth="0.5"
              >
                <title>{`${p.category}: AQI ${p.aqi} (${formatShortDate(p.timestamp)})`}</title>
              </circle>
            ))}
            {/* X-axis labels — show first, middle, last */}
            {[0, Math.floor(points.length / 2), points.length - 1].map((idx) => (
              <text
                key={idx}
                x={points[idx].x}
                y={CHART_HEIGHT - 2}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500"
                fontSize="8"
              >
                {history[idx] ? formatShortDate(history[idx].timestamp) : ""}
              </text>
            ))}
          </svg>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          Historical data from hourly air quality snapshots
        </p>
      </CardContent>
    </Card>
  );
}
