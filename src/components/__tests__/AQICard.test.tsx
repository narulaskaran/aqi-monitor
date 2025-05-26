import { renderWithTheme, screen } from "../../lib/test-utils";
import { AQICard } from "../AQICard";

describe("AQICard", () => {
  it("renders without crashing", () => {
    renderWithTheme(<AQICard />);
  });

  it("renders AQI and location", () => {
    renderWithTheme(
      <AQICard index={42} category="Good" dominantPollutant="O3" />
    );
    expect(screen.getByText(/aqi: 42/i)).toBeInTheDocument();
    expect(screen.getByText(/category: good/i)).toBeInTheDocument();
    expect(screen.getByText(/dominant pollutant: o3/i)).toBeInTheDocument();
  });
});
