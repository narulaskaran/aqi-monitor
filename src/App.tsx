import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { AQICard } from "./components/AQICard";
import { AQIHeader } from "./components/AQIHeader";
import { KofiButton } from "./components/KofiButton";
import "./App.css";
import { ChangeEvent, useEffect, useState } from "react";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { SubscriptionList } from "./components/SubscriptionList";
import { ForecastCard } from "./components/ForecastCard";
import { getAirQuality } from "./lib/api";
import { ThemeToggle } from "./components/ThemeToggle";
import AuthWidget from "./components/AuthWidget";
import { AQI_SCALE } from "./types/air-quality";

const ZIP_FORMAT_ERROR = "Please enter a valid 5-digit US ZIP code";

function AQIScaleLegend() {
  return (
    <div className="aqi-legend">
      <h2>What the numbers mean</h2>
      <ul>
        {AQI_SCALE.map((category) => (
          <li key={category.name}>
            <span
              className="aqi-legend-swatch"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <span className="aqi-legend-name">{category.name}</span>
            <span className="aqi-legend-range">
              {category.range[0]}–{category.range[1]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [zipCode, setZipCode] = useState("");
  const [currentZipCode, setCurrentZipCode] = useState("");
  const [pendingZipCode, setPendingZipCode] = useState("");
  const [airQuality, setAirQuality] = useState<{
    index: number;
    category: string;
    dominantPollutant: string;
    recordedAt?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);
      if (!zipCode.match(/^\d{5}$/)) {
        throw new Error(ZIP_FORMAT_ERROR);
      }

      setPendingZipCode(zipCode);
      setIsLoading(true);
      const data = await getAirQuality(zipCode);
      // Only switch ZIPs once the new reading is in, so the card never pairs
      // one ZIP's label and history with another ZIP's reading.
      setCurrentZipCode(zipCode);
      setAirQuality({
        index: data.index,
        category: data.category,
        dominantPollutant: data.dominantPollutant,
        recordedAt: data.recordedAt,
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== ZIP_FORMAT_ERROR) {
        console.error("Error fetching air quality data:", error);
      }
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch air quality data",
      );
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
    <div className="app">
      <header className="app-header">
        <AQIHeader />
        <div className="app-header-actions">
          <AuthWidget />
          <ThemeToggle className="app-theme-toggle" />
        </div>
      </header>

      <main className="app-main">
        <section className="app-intro" aria-labelledby="page-title">
          <h1 id="page-title">Check the air where you live.</h1>
          <p className="app-lede">
            Current AQI, health guidance, and a short-range forecast for any US
            ZIP code.
          </p>

          <form
            className="zip-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label htmlFor="zip-code">ZIP code</label>
            <div className="zip-form-row">
              <Input
                id="zip-code"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                placeholder="e.g. 94110"
                value={zipCode}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setZipCode(event.target.value)
                }
                aria-invalid={error === ZIP_FORMAT_ERROR ? true : undefined}
                aria-describedby={error ? "zip-error" : undefined}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Checking…" : "Get air quality"}
              </Button>
            </div>
            {error && (
              <p id="zip-error" className="zip-form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </section>

        <section className="result-panel" aria-label="Air quality result">
          {!airQuality && !isLoading && <AQIScaleLegend />}
          <div
            className="result-live"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading && (
              <div className="result-loading">
                <span className="result-spinner" aria-hidden="true" />
                Loading air quality for {pendingZipCode}…
              </div>
            )}
            {airQuality && !isLoading && (
              <AQICard
                index={airQuality.index}
                category={airQuality.category}
                dominantPollutant={airQuality.dominantPollutant}
                recordedAt={airQuality.recordedAt}
                zipCode={currentZipCode}
              />
            )}
          </div>
        </section>
      </main>

      {airQuality && (
        <section className="app-details" aria-label="Alerts and forecast">
          <SubscriptionForm zipCode={currentZipCode} />
          <ForecastCard zipCode={currentZipCode} />
        </section>
      )}

      <section className="app-subscriptions" aria-label="Your subscriptions">
        <SubscriptionList />
      </section>

      <footer className="app-footer">
        <span>Data from the Google Air Quality API.</span>
        <KofiButton />
      </footer>
    </div>
  );
}

export default App;
