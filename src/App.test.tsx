import { vi } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "./lib/test-utils";
import App from "./App";
import { getAirQuality as realGetAirQuality } from "./lib/api";

vi.mock("./lib/api", () => ({
  getAirQuality: vi.fn(),
  getAirQualityForecast: vi.fn(),
  getSubscriptions: vi.fn(),
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  updateSubscription: vi.fn(),
  getBaseUrl: vi.fn(() => "http://localhost:3000"),
  getApiUrl: vi.fn((path: string) => `http://localhost:3000/api/${path}`),
}));

const getAirQuality = realGetAirQuality as unknown as ReturnType<typeof vi.fn>;

describe("App accessibility", () => {
  beforeEach(() => {
    getAirQuality.mockReset();
  });

  it("associates the ZIP input with a visible label", () => {
    renderWithTheme(<App />);
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  });

  it("keeps an empty polite live region in the DOM before results exist", () => {
    renderWithTheme(<App />);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion).toBeEmptyDOMElement();
  });

  it("renders AQI results into the existing live region after lookup", async () => {
    getAirQuality.mockResolvedValue({
      index: 42,
      category: "Good",
      dominantPollutant: "pm25",
    });

    renderWithTheme(<App />);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toBeEmptyDOMElement();

    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: "12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get air quality/i }));

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/aqi: 42/i);
    });
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });
});
