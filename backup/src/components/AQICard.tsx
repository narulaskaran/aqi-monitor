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
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Air Quality Information</h2>
      <p className="text-lg">AQI: {index}</p>
      <p className="text-lg">Category: {category}</p>
      <p className="text-lg">
        Dominant Pollutant: {formatPollutant(dominantPollutant)}
      </p>
    </div>
  );
}
