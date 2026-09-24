import { renderWithTheme, screen } from "../../lib/test-utils";
import { KofiButton } from "../KofiButton";

describe("KofiButton", () => {
  it("renders without crashing", () => {
    renderWithTheme(<KofiButton />);
  });

  it("renders a link", () => {
    renderWithTheme(<KofiButton />);
    const link = screen.getByRole("link", { name: /support this project/i });
    expect(link).toHaveAttribute("href", "https://ko-fi.com/Y8Y21CC8IA");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
