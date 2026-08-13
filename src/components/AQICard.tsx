import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { getAQICategory } from "../types/air-quality";

interface AQICardProps {
  index: number;
  category: string;
  dominantPollutant: string;
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

export function AQICard({ index, category, dominantPollutant }: AQICardProps) {
  const categoryInfo = getAQICategory(category, index);

  return (
    <Card role="status" aria-live="polite" aria-atomic="true">
      <CardHeader>
        <CardTitle>Air Quality Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          data-testid="aqi-category-band"
          className="rounded-lg px-4 py-4"
          style={{
            backgroundColor: categoryInfo.color,
            color: categoryInfo.textColor,
          }}
        >
          <p className="text-lg font-medium">AQI: {index}</p>
          <p className="text-lg font-semibold">Category: {categoryInfo.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Health recommendation</p>
          <p className="text-sm">{categoryInfo.advice}</p>
        </div>
        <p className="text-lg">
          Dominant Pollutant: {formatPollutant(dominantPollutant)}
        </p>
      </CardContent>
    </Card>
  );
}
