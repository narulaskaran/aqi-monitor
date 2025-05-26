import { renderWithTheme, screen, fireEvent } from "../../lib/test-utils";
import { Button } from "./button";

describe("Button", () => {
  it("renders without crashing", () => {
    renderWithTheme(<Button>Test</Button>);
  });

  it("renders children", () => {
    renderWithTheme(<Button>Click Me</Button>);
    expect(screen.getByText(/click me/i)).toBeInTheDocument();
  });

  it("handles click event", () => {
    const handleClick = vi.fn();
    renderWithTheme(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByText(/click me/i));
    expect(handleClick).toHaveBeenCalled();
  });
});
