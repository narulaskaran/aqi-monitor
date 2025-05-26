import { renderWithTheme, screen } from "../../lib/test-utils";
import { Card } from "./card";

describe("Card", () => {
  it("renders without crashing", () => {
    renderWithTheme(<Card>Test</Card>);
  });

  it("renders children", () => {
    renderWithTheme(<Card>Card Content</Card>);
    expect(screen.getByText(/card content/i)).toBeInTheDocument();
  });
});
