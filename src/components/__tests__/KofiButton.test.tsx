import { renderWithTheme, screen } from "../../lib/test-utils";
import { KofiButton } from "../KofiButton";

describe("KofiButton", () => {
  it("renders without crashing", () => {
    renderWithTheme(<KofiButton />);
  });

  it("renders a link", () => {
    renderWithTheme(<KofiButton />);
    expect(
      screen.getByRole("link", { name: /buy me a coffee/i })
    ).toBeInTheDocument();
  });
});
