import { vi } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "../../lib/test-utils";
import AuthWidget from "../AuthWidget";

// Mock the UI components directly to avoid context issues
vi.mock("../ui/input-otp", () => ({
  InputOTP: ({ children, onChange, ...props }: any) => (
    <div data-testid="input-otp-container">
      <input
        data-testid="otp-input"
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: any) => <div>{children}</div>,
  InputOTPSlot: ({ index }: any) => <div data-testid={`otp-slot-${index}`} />,
}));

describe("AuthWidget", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    localStorage.clear();
  });
// ... (rest of the file remains the same)

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
    (global.fetch as any).mockResolvedValue({
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

  it("shows error if code verify fails", async () => {
    // Mock successful email send first
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: "Invalid code" }),
      });

    renderWithTheme(<AuthWidget />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    
    // Enter email
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));

    // Wait for OTP input to appear (mocked)
    const otpInput = await screen.findByTestId("otp-input");
    expect(otpInput).toBeInTheDocument();

    // Enter code
    fireEvent.change(otpInput, { target: { value: "123456" } });
    
    // Click verify
    const verifyBtn = screen.getByRole("button", { name: /verify/i });
    expect(verifyBtn).not.toBeDisabled();
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });
});
