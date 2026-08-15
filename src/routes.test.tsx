import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { renderWithTheme, screen } from "./lib/test-utils";
import { routes } from "./routes";

function renderPath(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return renderWithTheme(<RouterProvider router={router} />);
}

describe("app routes", () => {
  it.each(["/admin", "/dashboard", "/login", "/this-page-does-not-exist"])(
    "shows a user-facing 404 for %s",
    async (path) => {
      renderPath(path);

      expect(await screen.findByText("Page not found")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /return to home page/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/hey developer/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/unexpected application error/i)
      ).not.toBeInTheDocument();
    }
  );

  it("still renders the unsubscribe page", async () => {
    renderPath("/unsubscribe");

    expect(await screen.findByText("Unsubscribe Status")).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });
});
