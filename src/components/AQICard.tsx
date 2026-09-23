import { AQI_SCALE, getAQICategory } from "../types/air-quality";
import { HistoryChart } from "./HistoryChart";

interface AQICardProps {
  index: number;
  category: string;
  dominantPollutant: string;
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
  const within = Math.min(Math.max((index - low) / (high - low), 0), 1);
  return ((segment + within) / AQI_SCALE.length) * 100;
}

export function AQICard({ index, category, dominantPollutant, zipCode }: AQICardProps) {
  const categoryInfo = getAQICategory(category, index);
  const hasReading = Number.isFinite(index) && index >= 0;

  return (
    <article className="aqi-reading">
      <p className="aqi-reading-meta">
        Current conditions{zipCode ? ` · ${zipCode}` : ""}
      </p>

      <div className="aqi-reading-value">
        <p className="aqi-number">
          {hasReading ? index : "—"}
          <span className="aqi-number-label"> US AQI</span>
        </p>
        <p
          data-testid="aqi-category-band"
          className="aqi-category"
          style={{
            backgroundColor: categoryInfo.color,
            color: categoryInfo.textColor,
          }}
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

      <p className="aqi-advice">{categoryInfo.advice}</p>

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
