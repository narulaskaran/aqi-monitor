import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Air Quality Information</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg">AQI: {index}</p>
        <p className="text-lg">Category: {category}</p>
        <p className="text-lg">
          Dominant Pollutant: {formatPollutant(dominantPollutant)}
        </p>
      </CardContent>
    </Card>
  );
}
