import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { AQICard } from "./components/AQICard";
import { AQIHeader } from "./components/AQIHeader";
import { KofiButton } from "./components/KofiButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import "./App.css";
import { useState, ChangeEvent, useEffect } from "react";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { SubscriptionList } from "./components/SubscriptionList";
import { ForecastCard } from "./components/ForecastCard";
import { getAirQuality } from "./lib/api";
import { getAQIColor } from "./lib/utils";
import { ThemeToggle } from "./components/ThemeToggle";
import AuthWidget from "./components/AuthWidget";

function App() {
  const [zipCode, setZipCode] = useState("");
  const [currentZipCode, setCurrentZipCode] = useState("");
  const [airQuality, setAirQuality] = useState<{
    index: number;
    category: string;
    color: string;
    dominantPollutant: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setError(null);

      // Basic ZIP code validation
      if (!zipCode.match(/^\d{5}$/)) {
        throw new Error("Please enter a valid 5-digit US ZIP code");
      }

      // Update current ZIP code to trigger reset in SubscriptionForm
      setCurrentZipCode(zipCode);

      // Get air quality data directly using the ZIP code
      const data = await getAirQuality(zipCode);

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

  // Update currentZipCode when zipCode changes in the input
  useEffect(() => {
    if (!currentZipCode && zipCode) {
      setCurrentZipCode(zipCode);
    }
  }, [zipCode, currentZipCode]);

  return (
    <div className="min-h-screen p-4 transition-colors duration-300 rounded-lg shadow bg-background flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <ThemeToggle />
      </div>
      <div className="max-w-md mx-auto w-full flex-1">
        <AQIHeader />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleClick();
          }}
          className="flex gap-2 mb-4"
        >
          <Input
            type="text"
            placeholder="Zip code"
            value={zipCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setZipCode(e.target.value)
            }
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit">Get Air Quality</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>US codes only at this time</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {airQuality && (
          <>
            <AQICard
              index={airQuality.index}
              category={airQuality.category}
              dominantPollutant={airQuality.dominantPollutant}
              zipCode={currentZipCode}
            />
            <SubscriptionForm zipCode={currentZipCode} />
            <ForecastCard zipCode={currentZipCode} />
          </>
        )}
        <SubscriptionList />
      </div>

      {/* Move AuthWidget to the bottom, above Ko-Fi */}
      <div className="flex justify-center max-w-md mx-auto w-full mb-2">
        <AuthWidget />
      </div>
      <div className="flex justify-end items-center w-full mt-4">
        <KofiButton />
      </div>
    </div>
  );
}

export default App;
