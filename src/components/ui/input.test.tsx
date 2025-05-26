import { renderWithTheme, screen, fireEvent } from "../../lib/test-utils";
import { Input } from "./input";

describe("Input", () => {
  it("renders input element", () => {
    renderWithTheme(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("allows typing", () => {
    renderWithTheme(<Input />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input).toHaveValue("hello");
  });
});
