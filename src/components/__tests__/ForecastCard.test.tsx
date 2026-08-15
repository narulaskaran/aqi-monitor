import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "../../lib/test-utils";
import { ForecastCard } from "../ForecastCard";
import {
  getAirQualityForecast as realGetAirQualityForecast,
} from "../../lib/api";

vi.mock("../../lib/api", () => ({
  getAirQualityForecast: vi.fn(),
  getAirQuality: vi.fn(),
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  getSubscriptions: vi.fn(),
  updateSubscription: vi.fn(),
  getApiUrl: vi.fn(),
  getBaseUrl: vi.fn().mockReturnValue("http://localhost:3000"),
}));

const getAirQualityForecast =
  realGetAirQualityForecast as unknown as ReturnType<typeof vi.fn>;

describe("ForecastCard", () => {
  beforeEach(() => {
    getAirQualityForecast.mockReset();
  });

  it("renders the section title and form controls", () => {
    renderWithTheme(<ForecastCard zipCode="94102" />);
    expect(screen.getByText(/air quality forecast/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get forecast/i }),
    ).toBeInTheDocument();
  });

  it("fetches and renders forecast rows on submit", async () => {
    getAirQualityForecast.mockResolvedValue({
      success: true,
      zipCode: "94102",
      forecasts: [
        {
          date: "2026-06-12",
          maxAqi: 42,
          category: "Good",
          dominantPollutant: "PM2.5",
        },
        {
          date: "2026-06-13",
          maxAqi: 78,
          category: "Moderate",
          dominantPollutant: "O3",
        },
      ],
    });

    renderWithTheme(<ForecastCard zipCode="94102" />);

    fireEvent.click(screen.getByRole("button", { name: /get forecast/i }));

    await waitFor(() => {
      expect(screen.getByText(/AQI 42/)).toBeInTheDocument();
      expect(screen.getByText(/Good/)).toBeInTheDocument();
      expect(screen.getByText(/AQI 78/)).toBeInTheDocument();
      expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    });

    // Disclaimer text should be present
    expect(screen.getByText(/projections only/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    // A promise that never resolves — lets us observe the loading state
    getAirQualityForecast.mockReturnValue(new Promise(() => {}));

    renderWithTheme(<ForecastCard zipCode="94102" />);

    fireEvent.click(screen.getByRole("button", { name: /get forecast/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /loading/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch throws", async () => {
    getAirQualityForecast.mockRejectedValue(
      new Error("Forecasts are only available up to 4 days ahead."),
    );

    renderWithTheme(<ForecastCard zipCode="94102" />);

    fireEvent.click(screen.getByRole("button", { name: /get forecast/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/forecasts are only available up to 4 days ahead/i),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no forecasts returned", async () => {
    getAirQualityForecast.mockResolvedValue({
      success: true,
      zipCode: "94102",
      forecasts: [],
    });

    renderWithTheme(<ForecastCard zipCode="94102" />);

    fireEvent.click(screen.getByRole("button", { name: /get forecast/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no forecast data available/i),
      ).toBeInTheDocument();
    });
  });

  it("does not fetch when End date is cleared", async () => {
    renderWithTheme(<ForecastCard zipCode="94102" />);

    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "" },
    });

    expect(
      screen.getByRole("button", { name: /get forecast/i }),
    ).toBeDisabled();

    const form = screen
      .getByRole("button", { name: /get forecast/i })
      .closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
    });
    expect(getAirQualityForecast).not.toHaveBeenCalled();
  });

  it("caps the date picker at the API horizon just after UTC midnight", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-13T00:30:00.000Z"));

    try {
      renderWithTheme(<ForecastCard zipCode="94102" />);

      const start = screen.getByLabelText(/start date/i);
      const end = screen.getByLabelText(/end date/i);
      // Naive today+4 is 2026-08-17, which is past usable.end (Aug 16 23:00Z).
      expect(start).toHaveAttribute("max", "2026-08-16");
      expect(end).toHaveAttribute("max", "2026-08-16");
      expect(end).toHaveValue("2026-08-16");
    } finally {
      vi.useRealTimers();
    }
  });
});
