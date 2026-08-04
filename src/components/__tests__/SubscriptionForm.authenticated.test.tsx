import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../../lib/theme";
import { SubscriptionForm } from "../SubscriptionForm";
import { verifyCode as realVerifyCode } from "../../lib/api";
import { useAuth as realUseAuth } from "../../lib/auth";

vi.mock("../../lib/api", () => ({
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  useAuth: vi.fn(),
}));

const verifyCode = realVerifyCode as unknown as jest.Mock;
const useAuth = realUseAuth as unknown as jest.Mock;

const renderForm = (zipCode = "12345") =>
  render(
    <ThemeProvider>
      <SubscriptionForm zipCode={zipCode} />
    </ThemeProvider>
  );

describe("SubscriptionForm (signed in)", () => {
  beforeEach(() => {
    verifyCode.mockReset();
    useAuth.mockReturnValue({
      isSignedIn: true,
      email: "signedin@example.com",
      token: "session-token",
      isValidating: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it("skips the email/OTP flow and shows the signed-in email", () => {
    renderForm();
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
    expect(screen.getByText(/signedin@example.com/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("otp-input")).not.toBeInTheDocument();
  });

  it("does not show the OTP form while auth is being validated", () => {
    useAuth.mockReturnValue({
      isSignedIn: false,
      email: "",
      token: null,
      isValidating: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    renderForm();

    expect(screen.getByText(/checking sign-in status/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
  });

  it("subscribes directly using the session token without requesting a code", async () => {
    verifyCode.mockResolvedValue({ success: true, valid: true });
    renderForm("12345");

    fireEvent.click(screen.getByRole("button", { name: /sign up for alerts/i }));

    await waitFor(() => {
      expect(verifyCode).toHaveBeenCalledWith(
        undefined,
        "12345",
        undefined,
        undefined,
        undefined,
        "session-token",
      );
    });

    await screen.findByText(/subscribed/i);
  });

  it("shows an error if subscribing fails (e.g. already subscribed)", async () => {
    verifyCode.mockRejectedValue(
      new Error("This email is already subscribed for this ZIP code")
    );
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /sign up for alerts/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/already subscribed for this zip code/i)
      ).toBeInTheDocument();
    });
  });
});
