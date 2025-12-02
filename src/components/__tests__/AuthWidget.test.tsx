import { vi } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "../../lib/test-utils";
import AuthWidget from "../AuthWidget";

describe("AuthWidget", () => {
  beforeEach(() => {
    // @ts-expect-error - Mocking fetch
    global.fetch = undefined;
    localStorage.clear();
  });

  it("renders without crashing", () => {
    renderWithTheme(<AuthWidget />);
    // Add more specific assertions as needed
  });

  it("renders email input and submit button after clicking Sign In", () => {
    renderWithTheme(<AuthWidget />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send code/i })
    ).toBeInTheDocument();
  });

  it("allows typing in the email field after clicking Sign In", () => {
    renderWithTheme(<AuthWidget />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: "test@example.com" } });
    expect(input).toHaveValue("test@example.com");
  });

  it("shows error for invalid email", async () => {
    renderWithTheme(<AuthWidget />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: "bademail" } });
    const form = input.closest("form");
    fireEvent.submit(form!);
    await screen.findByText((content) =>
      content.includes("Invalid email format")
    );
  });

  it("shows error if code send fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: "API error" }),
    });
    renderWithTheme(<AuthWidget />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() => {
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
  });

  it.skip("shows error if code verify fails", async () => {
    // This test is skipped because simulating code entry is not implemented.
  });
});
