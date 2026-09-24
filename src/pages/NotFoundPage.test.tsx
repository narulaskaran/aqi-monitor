import { renderWithRouter, screen } from "../lib/test-utils";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("renders a user-facing 404 without React Router developer copy", () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or may have been moved."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to home page/i })
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByText(/hey developer/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/unexpected application error/i)
    ).not.toBeInTheDocument();
  });

  it("uses the Cloud Glass route shell", () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Data from the Google Air Quality API.")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support this project/i })).toHaveAttribute(
      "href",
      "https://ko-fi.com/Y8Y21CC8IA",
    );
  });
});
