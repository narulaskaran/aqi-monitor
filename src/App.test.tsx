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
  getAirQualityHistory: vi.fn().mockResolvedValue({
    success: true,
    zipCode: "12345",
    history: [],
  }),
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
      expect(liveRegion).toHaveTextContent(/42 US AQI/i);
    });
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("hides the previous reading while a repeat lookup is in flight", async () => {
    getAirQuality.mockResolvedValueOnce({
      index: 42,
      category: "Good",
      dominantPollutant: "pm25",
    });

    renderWithTheme(<App />);
    const liveRegion = screen.getByRole("status");
    const zipInput = screen.getByLabelText(/zip code/i);
    const submit = screen.getByRole("button", { name: /get air quality/i });

    fireEvent.change(zipInput, { target: { value: "12345" } });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/air quality near 12345/i);
    });

    let resolveSecond: (value: unknown) => void = () => undefined;
    getAirQuality.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );
    fireEvent.change(zipInput, { target: { value: "54321" } });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/loading air quality for 54321/i);
    });
    expect(liveRegion).not.toHaveTextContent(/42 US AQI/i);
    expect(liveRegion).not.toHaveTextContent(/air quality near 54321/i);

    resolveSecond({ index: 120, category: "", dominantPollutant: "o3" });
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/air quality near 54321/i);
    });
    expect(liveRegion).toHaveTextContent(/120 US AQI/i);
  });

  it("names the submitted ZIP while loading, even if the input changes", async () => {
    getAirQuality.mockReturnValueOnce(new Promise(() => undefined));

    renderWithTheme(<App />);
    const liveRegion = screen.getByRole("status");
    const zipInput = screen.getByLabelText(/zip code/i);

    fireEvent.change(zipInput, { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /get air quality/i }));
    fireEvent.change(zipInput, { target: { value: "99999" } });

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/loading air quality for 12345/i);
    });
    expect(liveRegion).not.toHaveTextContent(/99999/);
  });

  it("keeps the previous reading when a later lookup fails", async () => {
    getAirQuality
      .mockResolvedValueOnce({ index: 42, category: "Good", dominantPollutant: "pm25" })
      .mockRejectedValueOnce(new Error("Service unavailable"));

    renderWithTheme(<App />);
    const liveRegion = screen.getByRole("status");
    const zipInput = screen.getByLabelText(/zip code/i);
    const submit = screen.getByRole("button", { name: /get air quality/i });

    fireEvent.change(zipInput, { target: { value: "12345" } });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/42 US AQI/i);
    });

    fireEvent.change(zipInput, { target: { value: "54321" } });
    fireEvent.click(submit);
    expect(await screen.findByText(/service unavailable/i)).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent(/air quality near 12345/i);
    expect(liveRegion).toHaveTextContent(/42 US AQI/i);
  });

  it("marks the ZIP input invalid only for format errors", async () => {
    getAirQuality.mockRejectedValueOnce(new Error("Service unavailable"));

    renderWithTheme(<App />);
    const zipInput = screen.getByLabelText(/zip code/i);
    const submit = screen.getByRole("button", { name: /get air quality/i });

    fireEvent.change(zipInput, { target: { value: "123" } });
    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid 5-digit/i);
    expect(zipInput).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(zipInput, { target: { value: "12345" } });
    fireEvent.click(submit);
    expect(await screen.findByText(/service unavailable/i)).toBeInTheDocument();
    expect(zipInput).not.toHaveAttribute("aria-invalid");
  });
});
