import { renderWithTheme, screen } from "../../lib/test-utils";
import { AQICard } from "../AQICard";
import { AQI_CATEGORIES } from "../../types/air-quality";

describe("AQICard", () => {
  it("renders without crashing", () => {
    renderWithTheme(
      <AQICard index={42} category="Good" dominantPollutant="O3" />,
    );
  });

  it("renders AQI, category, and pollutant", () => {
    renderWithTheme(
      <AQICard index={42} category="Good" dominantPollutant="O3" />,
    );
    expect(screen.getByText(/aqi: 42/i)).toBeInTheDocument();
    expect(screen.getByText(/category: good/i)).toBeInTheDocument();
    expect(screen.getByText(/dominant pollutant: o3/i)).toBeInTheDocument();
  });

  it("color-codes the AQI band and shows the health recommendation", () => {
    const moderate = AQI_CATEGORIES.Moderate;
    renderWithTheme(
      <AQICard index={75} category="Moderate" dominantPollutant="pm25" />,
    );

    const band = screen.getByTestId("aqi-category-band");
    expect(band).toHaveStyle({
      backgroundColor: moderate.color,
      color: moderate.textColor,
    });
    expect(screen.getByText(/health recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(moderate.advice)).toBeInTheDocument();
  });

  it("uses EPA Unhealthy colors and advice for that category", () => {
    const unhealthy = AQI_CATEGORIES.Unhealthy;
    renderWithTheme(
      <AQICard
        index={175}
        category="Unhealthy"
        dominantPollutant="o3"
      />,
    );

    expect(screen.getByTestId("aqi-category-band")).toHaveStyle({
      backgroundColor: unhealthy.color,
      color: unhealthy.textColor,
    });
    expect(screen.getByText(unhealthy.advice)).toBeInTheDocument();
  });

  it("renders the recorded time when provided", () => {
    const recordedAt = "2026-08-24T14:34:00.000Z";
    const formattedTime = new Date(recordedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    renderWithTheme(
      <AQICard
        index={42}
        category="Good"
        dominantPollutant="O3"
        recordedAt={recordedAt}
      />,
    );

    expect(screen.getByText(`As of ${formattedTime}`)).toBeInTheDocument();
  });

  it("does not render a recorded time when it is absent", () => {
    renderWithTheme(
      <AQICard index={42} category="Good" dominantPollutant="O3" />,
    );

    expect(screen.queryByText(/^As of /)).not.toBeInTheDocument();
  });
});
