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
import { ChangeEvent, useEffect, useState } from "react";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { SubscriptionList } from "./components/SubscriptionList";
import { ForecastCard } from "./components/ForecastCard";
import { getAirQuality } from "./lib/api";
import { ThemeToggle } from "./components/ThemeToggle";
import AuthWidget from "./components/AuthWidget";

const CloudIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path
      d="M12 31.5h24.5a7.5 7.5 0 0 0 .7-15 12.2 12.2 0 0 0-23.4-1.6A8.4 8.4 0 0 0 12 31.5Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M15 36h18M20 40h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function App() {
  const [zipCode, setZipCode] = useState("");
  const [currentZipCode, setCurrentZipCode] = useState("");
  const [airQuality, setAirQuality] = useState<{
    index: number;
    category: string;
    dominantPollutant: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);
      if (!zipCode.match(/^\d{5}$/)) {
        throw new Error("Please enter a valid 5-digit US ZIP code");
      }

      setCurrentZipCode(zipCode);
      setIsLoading(true);
      const data = await getAirQuality(zipCode);
      setAirQuality({
        index: data.index,
        category: data.category,
        dominantPollutant: data.dominantPollutant,
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("valid 5-digit")) {
        console.error("Error fetching air quality data:", error);
      }
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch air quality data",
      );
      setAirQuality(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentZipCode && zipCode) {
      setCurrentZipCode(zipCode);
    }
  }, [zipCode, currentZipCode]);

  return (
    <div className="cloud-app">
      <div className="cloud-shape cloud-shape-one" aria-hidden="true" />
      <div className="cloud-shape cloud-shape-two" aria-hidden="true" />
      <div className="cloud-shape cloud-shape-three" aria-hidden="true" />

      <header className="cloud-topbar">
        <AQIHeader />
        <div className="cloud-utilities">
          <span className="cloud-live-label">Live air quality</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="cloud-main">
        <section className="cloud-hero" aria-labelledby="cloud-page-title">
          <p className="cloud-eyebrow">Know your air</p>
          <h1 id="cloud-page-title">Breathe easier where you are.</h1>
          <p className="cloud-lede">
            A clear, current read on the air around you — without the noise.
          </p>

          <form
            className="cloud-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label htmlFor="zip-code" className="cloud-field-label">
              ZIP code
            </label>
            <div className="cloud-form-row">
              <div className="cloud-input-wrap">
                <span className="cloud-pin" aria-hidden="true">
                  ⌖
                </span>
                <Input
                  id="zip-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="Enter a ZIP code"
                  value={zipCode}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setZipCode(event.target.value)
                  }
                  className="cloud-input"
                  aria-describedby="zip-helper"
                />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" disabled={isLoading} className="cloud-primary">
                      {isLoading ? "Checking…" : "Get Air Quality"}
                      {!isLoading && <span aria-hidden="true">↗</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>US codes only at this time</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p id="zip-helper" className="cloud-helper">
              Try a US ZIP code, like 10001
            </p>
          </form>

          {error && (
            <p className="cloud-error" role="alert">
              {error}
            </p>
          )}

          <div className="cloud-account">
            <span>Save locations and get updates</span>
            <AuthWidget />
          </div>
        </section>

        <aside className="cloud-result-shell" aria-label="Air quality result">
          {!airQuality && !isLoading && (
            <div className="cloud-empty-state">
              <div className="cloud-empty-icon">
                <CloudIcon />
              </div>
              <h2>Your air, at a glance.</h2>
              <p>Enter a ZIP code to see the latest local air-quality reading.</p>
            </div>
          )}
          {isLoading && (
            <div className="cloud-loading-state" role="status">
              <span className="cloud-spinner" aria-hidden="true" />
              <h2>Reading the air…</h2>
              <p>Checking the latest conditions near {zipCode}.</p>
            </div>
          )}
          <div
            className="cloud-live-result"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy={isLoading}
          >
            {airQuality && (
              <AQICard
                index={airQuality.index}
                category={airQuality.category}
                dominantPollutant={airQuality.dominantPollutant}
                zipCode={currentZipCode}
              />
            )}
          </div>
        </aside>
      </main>

      {airQuality && (
        <section className="cloud-details" aria-label="Air quality details">
          <SubscriptionForm zipCode={currentZipCode} />
          <ForecastCard zipCode={currentZipCode} />
          <SubscriptionList />
        </section>
      )}

      <footer className="cloud-footer">
        <span>Designed for quick decisions.</span>
        <KofiButton className="cloud-kofi" />
      </footer>
    </div>
  );
}

export default App;
