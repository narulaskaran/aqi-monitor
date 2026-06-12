import { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "./theme";
import { AuthProvider } from "./auth";
import { MemoryRouter } from "react-router-dom";

// Custom render with ThemeProvider and AuthProvider
const renderWithTheme = (ui: ReactNode, options?: RenderOptions) =>
  render(
    <ThemeProvider>
      <AuthProvider>{ui}</AuthProvider>
    </ThemeProvider>,
    options,
  );

// Custom render with ThemeProvider and MemoryRouter
interface RouterOptions extends RenderOptions {
  initialEntries?: string[];
}

const renderWithRouter = (ui: ReactNode, options?: RouterOptions) => {
  const { initialEntries = ["/"], ...rest } = options || {};
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
    rest,
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";
export { renderWithTheme, renderWithRouter };
