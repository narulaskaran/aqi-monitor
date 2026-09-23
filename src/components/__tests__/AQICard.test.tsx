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
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByTestId("aqi-category-band")).toHaveTextContent("Good");
    expect(screen.getByText(/main pollutant/i)).toBeInTheDocument();
    expect(screen.getByText("O3")).toBeInTheDocument();
  });

  it("color-codes the category and shows the health recommendation", () => {
    const moderate = AQI_CATEGORIES.Moderate;
    renderWithTheme(
      <AQICard index={75} category="Moderate" dominantPollutant="pm25" />,
    );

    const band = screen.getByTestId("aqi-category-band");
    expect(band).toHaveStyle({
      backgroundColor: moderate.color,
      color: moderate.textColor,
    });
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

  it.each([
    [0, "0%"],
    [50, "16.6667%"],
    [51, "16.6667%"],
    [100, "33.3333%"],
    [101, "33.3333%"],
    [500, "100%"],
    [600, "100%"],
  ])("places AQI %i at %s along the scale", (index, left) => {
    const { container } = renderWithTheme(
      <AQICard index={index} category="" dominantPollutant="pm25" />,
    );
    const marker = container.querySelector<HTMLElement>(".aqi-scale-marker");
    expect(parseFloat(marker!.style.left)).toBeCloseTo(parseFloat(left), 3);
  });

  it("hides the scale when there is no reading", () => {
    const { container } = renderWithTheme(
      <AQICard index={-1} category="" dominantPollutant="pm25" />,
    );
    expect(container.querySelector(".aqi-scale")).toBeNull();
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
