import { AQI_SCALE, getAQICategory } from "../types/air-quality";
import { HistoryChart } from "./HistoryChart";
import type { CSSProperties } from "react";

interface AQICardProps {
  index: number;
  category: string;
  dominantPollutant: string;
  recordedAt?: string;
  zipCode?: string;
}

const formatPollutant = (pollutant: string): string => {
  const pollutantMap: { [key: string]: string } = {
    o3: "Ozone (O₃)",
    pm25: "Fine particulate matter (PM2.5)",
    pm10: "Coarse particulate matter (PM10)",
    no2: "Nitrogen dioxide (NO₂)",
    so2: "Sulfur dioxide (SO₂)",
    co: "Carbon monoxide (CO)",
  };
  return pollutantMap[pollutant] || pollutant;
};

/**
 * Position of an AQI value along the scale bar, as a percentage. Each EPA
 * category gets an equal-width segment so low values stay readable.
 */
function scalePosition(index: number): number {
  const segment = AQI_SCALE.findIndex(({ range }) => index <= range[1]);
  if (segment === -1) return 100;
  const [low, high] = AQI_SCALE[segment].range;
  const within = Math.min(Math.max((index - low) / Math.max(high - low, 1), 0), 1);
  return ((segment + within) / AQI_SCALE.length) * 100;
}

export function AQICard({
  index,
  category,
  dominantPollutant,
  recordedAt,
  zipCode,
}: AQICardProps) {
  const categoryInfo = getAQICategory(category, index);
  const formattedRecordedAt = recordedAt
    ? new Date(recordedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const hasReading = Number.isFinite(index) && index >= 0;

  return (
    <article className="aqi-reading">
      <p className="aqi-reading-heading">
        Air quality near {zipCode || "your location"}
      </p>
      <p className="aqi-reading-meta">
        {formattedRecordedAt && (
          <span>As of {formattedRecordedAt}</span>
        )}
      </p>

      <div
        className="aqi-reading-summary"
        style={{ "--aqi-category-color": categoryInfo.color } as CSSProperties}
      >
        <div>
          <p className="aqi-number-label">Current air quality index</p>
          <p className="aqi-number">
            {hasReading ? index : "—"}
            <span className="aqi-unit-label"> US AQI</span>
          </p>
        </div>
        <p
          data-testid="aqi-category-band"
          className="aqi-category"
        >
          {categoryInfo.name}
        </p>
      </div>

      {hasReading && (
        <div className="aqi-scale" aria-hidden="true">
          {AQI_SCALE.map(({ name, color }) => (
            <span key={name} style={{ backgroundColor: color }} />
          ))}
          <span
            className="aqi-scale-marker"
            style={{ left: `${scalePosition(index)}%` }}
          />
        </div>
      )}

      <div className="aqi-health-guidance">
        <p className="aqi-health-heading">What this means</p>
        <p className="aqi-advice">{categoryInfo.advice}</p>
      </div>

      <dl className="aqi-facts">
        <dt>Main pollutant</dt>
        <dd>{formatPollutant(dominantPollutant)}</dd>
      </dl>

      {zipCode && (
        <div className="aqi-history">
          <HistoryChart zipCode={zipCode} />
        </div>
      )}
    </article>
  );
}
