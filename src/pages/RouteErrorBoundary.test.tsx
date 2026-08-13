import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { renderWithTheme, screen } from "../lib/test-utils";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function renderErrorRoute(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            path: "missing",
            loader: () => {
              throw new Response("Not Found", { status: 404 });
            },
            element: <div>should not render</div>,
          },
          {
            path: "boom",
            loader: () => {
              throw new Error("kaboom");
            },
            element: <div>should not render</div>,
          },
        ],
      },
    ],
    { initialEntries: [path] }
  );

  return renderWithTheme(<RouterProvider router={router} />);
}

describe("RouteErrorBoundary", () => {
  it("shows the 404 page for unmatched route errors", async () => {
    renderErrorRoute("/missing");

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText(/hey developer/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/unexpected application error/i)
    ).not.toBeInTheDocument();
  });

  it("shows a user-facing error for unexpected failures", async () => {
    renderErrorRoute("/boom");

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/hey developer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kaboom/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/unexpected application error/i)
    ).not.toBeInTheDocument();
  });
});
