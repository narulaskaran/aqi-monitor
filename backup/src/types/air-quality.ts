export interface AirQualityResponse {
  index: number;
  category: string;
  dominantPollutant: string;
  pollutants: {
    [key: string]: {
      concentration: number;
      unit: string;
    };
  };
}

export interface AirQualityError {
  error: string;
} 