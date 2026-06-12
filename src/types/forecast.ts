// NOTE: keep in sync with the backend copy in api/_lib/services/airQuality.ts
// (api/ and src/ build separately, so the type can't be shared directly)
export interface DailyForecast {
  date: string; // YYYY-MM-DD (UTC)
  maxAqi: number;
  category: string;
  dominantPollutant: string;
}
