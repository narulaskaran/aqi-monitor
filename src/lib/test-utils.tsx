import { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "./theme";
import { MemoryRouter } from "react-router-dom";

// Custom render with ThemeProvider
const renderWithTheme = (ui: ReactNode, options?: RenderOptions) =>
  render(<ThemeProvider>{ui}</ThemeProvider>, options);

// Custom render with ThemeProvider and MemoryRouter
interface RouterOptions extends RenderOptions {
  initialEntries?: string[];
}

const renderWithRouter = (ui: ReactNode, options?: RouterOptions) => {
  const { initialEntries = ["/"], ...rest } = options || {};
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ThemeProvider>,
    rest
  );
};

export * from "@testing-library/react";
export { renderWithTheme, renderWithRouter };
