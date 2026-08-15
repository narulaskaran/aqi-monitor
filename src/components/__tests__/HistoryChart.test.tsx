import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderWithTheme, screen, waitFor } from "../../lib/test-utils";
import { HistoryChart } from "../HistoryChart";
import { getAirQualityHistory as realGetAirQualityHistory } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  getAirQualityHistory: vi.fn(),
  getAirQuality: vi.fn(),
  getAirQualityForecast: vi.fn(),
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  getSubscriptions: vi.fn(),
  updateSubscription: vi.fn(),
  getApiUrl: vi.fn(),
  getBaseUrl: vi.fn().mockReturnValue("http://localhost:3000"),
}));

const getAirQualityHistory =
  realGetAirQualityHistory as unknown as ReturnType<typeof vi.fn>;

describe("HistoryChart", () => {
  beforeEach(() => {
    getAirQualityHistory.mockReset();
  });

  it("shows a loading placeholder on first render", () => {
    getAirQualityHistory.mockReturnValue(new Promise(() => {}));
    renderWithTheme(<HistoryChart zipCode="94102" />);
    expect(screen.getByText(/loading chart/i)).toBeInTheDocument();
  });

  it("renders a chart once at least two history points load", async () => {
    getAirQualityHistory.mockResolvedValue({
      success: true,
      zipCode: "94102",
      history: [
        {
          timestamp: "2026-06-20T12:00:00.000Z",
          aqi: 42,
          category: "Good",
        },
        {
          timestamp: "2026-06-26T12:00:00.000Z",
          aqi: 78,
          category: "Moderate",
        },
      ],
    });

    renderWithTheme(<HistoryChart zipCode="94102" />);

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /air quality index trend chart/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/last 7 days aqi trend/i)).toBeInTheDocument();
  });

  it("hides the chart when fewer than two points exist", async () => {
    getAirQualityHistory.mockResolvedValue({
      success: true,
      zipCode: "94102",
      history: [
        {
          timestamp: "2026-06-20T12:00:00.000Z",
          aqi: 42,
          category: "Good",
        },
      ],
    });

    const { container } = renderWithTheme(<HistoryChart zipCode="94102" />);
    await waitFor(() => {
      expect(getAirQualityHistory).toHaveBeenCalled();
    });
    expect(container.querySelector("svg")).toBeNull();
  });
});
