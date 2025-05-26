import { renderWithTheme, screen } from "../../lib/test-utils";
import { AQIHeader } from "../AQIHeader";

describe("AQIHeader", () => {
  it("renders without crashing", () => {
    renderWithTheme(<AQIHeader />);
  });

  it("renders header text", () => {
    renderWithTheme(<AQIHeader />);
    expect(screen.getByText(/aqi monitor/i)).toBeInTheDocument();
  });
});
