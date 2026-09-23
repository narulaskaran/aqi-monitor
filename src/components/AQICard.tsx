import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { getAQICategory } from "../types/air-quality";
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
    pm25: "Fine Particulate Matter (PM2.5)",
    pm10: "Coarse Particulate Matter (PM10)",
    no2: "Nitrogen Dioxide (NO₂)",
    so2: "Sulfur Dioxide (SO₂)",
    co: "Carbon Monoxide (CO)",
  };
  return pollutantMap[pollutant] || pollutant;
};

export function AQICard({ index, category, dominantPollutant, zipCode }: AQICardProps) {
  const categoryInfo = getAQICategory(category, index);

  return (
    <Card className="cloud-result-card">
      <CardHeader>
        <CardTitle className="cloud-result-heading">Air Quality Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          data-testid="aqi-category-band"
          className="cloud-category-band rounded-lg px-4 py-4"
          style={{
            backgroundColor: categoryInfo.color,
            color: categoryInfo.textColor,
          }}
        >
          <p className="text-lg font-medium">AQI: {index}</p>
          <p className="text-lg font-semibold">Category: {categoryInfo.name}</p>
        </div>
        <div>
          <p className="cloud-health-label text-sm font-medium">Health recommendation</p>
          <p className="cloud-health-copy text-sm">{categoryInfo.advice}</p>
        </div>
        <p className="cloud-result-muted text-lg">
          Dominant Pollutant: {formatPollutant(dominantPollutant)}
        </p>

        {zipCode && <HistoryChart zipCode={zipCode} />}
      </CardContent>
    </Card>
  );
}
