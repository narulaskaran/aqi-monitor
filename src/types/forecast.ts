export interface DailyForecast {
  date: string; // YYYY-MM-DD (UTC)
  maxAqi: number;
  category: string;
  dominantPollutant: string;
}
