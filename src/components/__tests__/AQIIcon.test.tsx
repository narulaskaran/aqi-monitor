import { renderWithTheme } from "../../lib/test-utils";
import { AQIIcon } from "../AQIIcon";

describe("AQIIcon", () => {
  it("renders with className prop", () => {
    renderWithTheme(<AQIIcon className="test-class" />);
    // No error thrown, icon rendered
  });
});
