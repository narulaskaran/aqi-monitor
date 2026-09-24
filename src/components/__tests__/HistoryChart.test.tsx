import { vi, describe, it, expect, beforeEach } from "vitest";
import { act, renderWithTheme, screen, waitFor } from "../../lib/test-utils";
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

  it("keeps the trend area absent while loading", () => {
    getAirQualityHistory.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithTheme(<HistoryChart zipCode="94102" />);
    expect(container.textContent).toBe("");
  });

  it("renders an accessible chart after six distinct days of data", async () => {
    const history = Array.from({ length: 6 }, (_, day) => ({
      timestamp: `2026-06-${String(20 + day).padStart(2, "0")}T12:00:00.000Z`,
      aqi: 42 + day * 4,
      category: "Good",
    }));
    getAirQualityHistory.mockResolvedValue({
      success: true,
      zipCode: "94102",
      history: [
        ...history,
        { ...history[0], timestamp: "2026-06-20T13:00:00.000Z", aqi: 45 },
      ],
    });

    const { container } = renderWithTheme(<HistoryChart zipCode="94102" />);

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /values ranged from 42 to 62/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/last 7 days aqi trend/i)).toBeInTheDocument();
    expect(container.querySelector("svg desc")).toHaveTextContent("AQI 42");
    expect(container.querySelector("svg desc")).toHaveTextContent("AQI 62");
    expect(container.querySelector("svg desc")).toHaveTextContent("Historical AQI snapshots");
    expect(container.querySelector("svg desc")).toHaveTextContent("1:00 PM UTC: AQI 45");
  });

  it("renders no chart or placeholder when fewer than six distinct days exist", async () => {
    const fiveDays = Array.from({ length: 5 }, (_, day) => ({
      timestamp: `2026-06-${String(20 + day).padStart(2, "0")}T12:00:00.000Z`,
      aqi: 42 + day * 4,
      category: "Good",
    }));
    let resolveHistory!: (value: {
      success: boolean;
      zipCode: string;
      history: typeof fiveDays;
    }) => void;
    getAirQualityHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    const { container } = renderWithTheme(<HistoryChart zipCode="94102" />);
    await waitFor(() => {
      expect(getAirQualityHistory).toHaveBeenCalled();
    });
    expect(container.textContent).toBe("");
    await act(async () => {
      resolveHistory({
        success: true,
        zipCode: "94102",
        history: [...fiveDays, { ...fiveDays[0], aqi: 55 }],
      });
    });
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("does not show a trend placeholder on history request failure", async () => {
    let rejectHistory!: (error: Error) => void;
    getAirQualityHistory.mockReturnValue(
      new Promise((_, reject) => {
        rejectHistory = reject;
      }),
    );
    const { container } = renderWithTheme(<HistoryChart zipCode="94102" />);
    await waitFor(() => expect(getAirQualityHistory).toHaveBeenCalled());
    expect(container.textContent).toBe("");
    await act(async () => {
      rejectHistory(new Error("unavailable"));
    });
    expect(container.textContent).toBe("");
    expect(container.querySelector("svg")).toBeNull();
  });
});
