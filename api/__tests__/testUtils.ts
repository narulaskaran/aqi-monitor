import { vi } from "vitest";
// Shared test utilities for backend tests
export function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

export const mockSubscription = {
  id: "id",
  email: "a@b.com",
  zipCode: "12345",
  createdAt: new Date(),
  active: true,
  activatedAt: new Date(),
  updatedAt: new Date(),
  lastEmailSentAt: null,
};

export const mockAirQualityRecord = {
  zipCode: "12345",
  category: "Good",
  dominantPollutant: "PM2.5",
  id: "aq-1",
  aqi: 50,
  index: 50,
  timestamp: new Date(),
  pollutantData: {},
  pollutants: {},
};
