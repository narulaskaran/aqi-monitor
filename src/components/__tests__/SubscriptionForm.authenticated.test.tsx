import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../../lib/theme";
import { SubscriptionForm } from "../SubscriptionForm";
import { createSubscription as realCreateSubscription } from "../../lib/api";
import { useAuth as realUseAuth } from "../../lib/auth";

vi.mock("../../lib/api", () => ({
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  createSubscription: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  useAuth: vi.fn(),
}));

const createSubscription = realCreateSubscription as unknown as jest.Mock;
const useAuth = realUseAuth as unknown as jest.Mock;

const renderForm = (zipCode = "12345") =>
  render(
    <ThemeProvider>
      <SubscriptionForm zipCode={zipCode} />
    </ThemeProvider>
  );

describe("SubscriptionForm (signed in)", () => {
  beforeEach(() => {
    createSubscription.mockReset();
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

  it("subscribes directly using the session token without requesting a code", async () => {
    createSubscription.mockResolvedValue({ success: true });
    renderForm("12345");

    fireEvent.click(screen.getByRole("button", { name: /sign up for alerts/i }));

    await waitFor(() => {
      expect(createSubscription).toHaveBeenCalledWith(
        "session-token",
        "12345",
        undefined,
        undefined
      );
    });

    await screen.findByText(/subscribed/i);
  });

  it("shows an error if subscribing fails (e.g. already subscribed)", async () => {
    createSubscription.mockRejectedValue(
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
