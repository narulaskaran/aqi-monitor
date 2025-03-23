import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { AQICard } from "./components/AQICard";
import { AQIHeader } from "./components/AQIHeader";
import { AQIIcon } from "./components/AQIIcon";
import { KofiButton } from "./components/KofiButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import "./App.css";
import { trpc } from "./lib/trpc";
import { useState, ChangeEvent, KeyboardEvent } from "react";

function App() {
  const [zipCode, setZipCode] = useState("");
  const [airQuality, setAirQuality] = useState<{
    index: number;
    category: string;
    color: string;
    dominantPollutant: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAQIColor = (index: number): string => {
    if (index <= 50) return "bg-green-100";
    if (index <= 100) return "bg-yellow-100";
    if (index <= 150) return "bg-orange-100";
    if (index <= 200) return "bg-red-100";
    if (index <= 300) return "bg-purple-100";
    return "bg-maroon-100";
  };

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

  const handleClick = async () => {
    try {
      setError(null);
      // First, get coordinates from zip code
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${zipCode}`
      );

      if (!geocodeResponse.ok) {
        throw new Error("Failed to geocode zip code");
      }

      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.length) {
        throw new Error("Invalid zip code");
      }

      // Filter for US results
      const usLocation = geocodeData.find((location: any) =>
        location.display_name.endsWith(", United States")
      );

      if (!usLocation) {
        throw new Error("ZIP code not found in United States");
      }

      const { lat, lon } = usLocation;

      // Then get air quality data
      const data = await trpc.fetchAirQuality.query({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      });

      setAirQuality({
        index: data.index,
        category: data.category,
        color: getAQIColor(data.index),
        dominantPollutant: data.dominantPollutant,
      });
    } catch (error) {
      console.error("Error fetching air quality data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch air quality data"
      );
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleClick();
    }
  };

  return (
    <div
      className={`min-h-screen p-4 transition-colors duration-300 rounded-lg shadow ${
        airQuality?.color || "bg-white"
      } flex flex-col`}
    >
      <div className="max-w-md mx-auto w-full flex-1">
        <AQIHeader />
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Zip code"
            value={zipCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setZipCode(e.target.value)
            }
            onKeyUp={handleKeyPress}
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleClick}>Get Air Quality</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>US codes only at this time</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {airQuality && (
          <AQICard
            index={airQuality.index}
            category={airQuality.category}
            dominantPollutant={airQuality.dominantPollutant}
          />
        )}
      </div>

      <KofiButton className="w-full flex justify-end" />
    </div>
  );
}

export default App;
