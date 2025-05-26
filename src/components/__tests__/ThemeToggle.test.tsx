import { renderWithTheme, screen, fireEvent } from "../../lib/test-utils";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  it("renders toggle button", () => {
    renderWithTheme(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle/i })).toBeInTheDocument();
  });

  it("can be clicked", () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(button);
    expect(button).toBeInTheDocument();
  });
});
