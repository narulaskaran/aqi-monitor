import { renderWithTheme } from "../lib/test-utils";
import AdminPage from "./AdminPage";

describe("AdminPage", () => {
  it("renders without crashing", () => {
    renderWithTheme(<AdminPage />);
  });
});
