import { renderWithTheme, screen } from "../../lib/test-utils";
import { Alert } from "./alert";

describe("Alert", () => {
  it("renders without crashing", () => {
    renderWithTheme(<Alert>Test</Alert>);
  });

  it("renders children", () => {
    renderWithTheme(<Alert>Test Alert</Alert>);
    expect(screen.getByText(/test alert/i)).toBeInTheDocument();
  });
});
