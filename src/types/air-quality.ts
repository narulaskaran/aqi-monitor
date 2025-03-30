/**
 * Air Quality data types
 */

// Air quality data returned from the API
export interface AirQualityData {
  index: number;
  category: string;
  dominantPollutant: string;
  pollutants?: Record<string, {
    concentration: number;
    unit: string;
  }>;
  error?: string; // Optional error field for error states
}

// Category information with display properties
export interface AQICategory {
  name: string;
  range: [number, number];
  description: string;
  color: string;
  textColor: string;
  advice: string;
}

// Map of AQI categories and their properties
export const AQI_CATEGORIES: Record<string, AQICategory> = {
  'Good': {
    name: 'Good',
    range: [0, 50],
    description: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
    color: '#00E400',
    textColor: '#000000',
    advice: 'It\'s a great day to be active outside!'
  },
  'Moderate': {
    name: 'Moderate',
    range: [51, 100],
    description: 'Air quality is acceptable; however, some pollutants may be a moderate health concern for a small number of people.',
    color: '#FFFF00',
    textColor: '#000000',
    advice: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.'
  },
  'Unhealthy for Sensitive Groups': {
    name: 'Unhealthy for Sensitive Groups',
    range: [101, 150],
    description: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
    color: '#FF7E00',
    textColor: '#000000',
    advice: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.'
  },
  'Unhealthy': {
    name: 'Unhealthy',
    range: [151, 200],
    description: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
    color: '#FF0000',
    textColor: '#FFFFFF',
    advice: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else should limit prolonged outdoor exertion.'
  },
  'Very Unhealthy': {
    name: 'Very Unhealthy',
    range: [201, 300],
    description: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
    color: '#99004C',
    textColor: '#FFFFFF',
    advice: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else should limit outdoor exertion.'
  },
  'Hazardous': {
    name: 'Hazardous',
    range: [301, 500],
    description: 'Health alert: everyone may experience more serious health effects.',
    color: '#7E0023',
    textColor: '#FFFFFF',
    advice: 'Everyone should avoid all outdoor exertion.'
  },
  'Unknown': {
    name: 'Unknown',
    range: [-1, -1],
    description: 'Air quality information is unavailable at this time.',
    color: '#CCCCCC',
    textColor: '#000000',
    advice: 'Unable to determine air quality. Please try again later.'
  }
};