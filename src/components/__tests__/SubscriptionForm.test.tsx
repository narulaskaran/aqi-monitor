import { vi } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "../../lib/test-utils";
import { SubscriptionForm } from "../SubscriptionForm";
import {
  startVerification as realStartVerification,
  verifyCode as realVerifyCode,
} from "../../lib/api";

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

vi.mock("../../lib/api", () => ({
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
}));

const startVerification = realStartVerification as unknown as jest.Mock;
const verifyCode = realVerifyCode as unknown as jest.Mock;

describe("SubscriptionForm", () => {
  beforeEach(() => {
    startVerification.mockReset();
    verifyCode.mockReset();
  });

  it("renders email field and submit button", () => {
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows error for invalid email", async () => {
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "bademail" } });
    const form = emailInput.closest("form");
    fireEvent.submit(form!);
    await screen.findByText((content) =>
      content.includes(
        "Please enter a valid email address (e.g., example@domain.com)"
      )
    );
  });

  it("shows error for missing zip code", async () => {
    renderWithTheme(<SubscriptionForm zipCode="" />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(/zip code is required/i)).toBeInTheDocument();
    });
  });

  it("shows error if API returns error", async () => {
    startVerification.mockResolvedValue({ success: false, error: "API error" });
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });

  it("shows error if code verification fails", async () => {
    startVerification.mockResolvedValue({ success: true });
    verifyCode.mockResolvedValue({ success: false, error: "Invalid code" });
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    
    // Start verification
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button"));
    
    // Wait for code input
    await waitFor(() => {
      expect(screen.getAllByText(/verification code/i).length).toBeGreaterThan(0);
    });

    // Enter code
    const otpInput = screen.getByTestId("otp-input");
    fireEvent.change(otpInput, { target: { value: "123456" } });
    
    // Verify
    const verifyBtn = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
    });
  });
});
