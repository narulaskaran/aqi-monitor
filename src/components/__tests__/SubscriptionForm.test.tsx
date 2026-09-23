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
import { OTP_LENGTH } from "../../lib/utils";

// Mock the UI components directly to avoid context issues
vi.mock("../ui/input-otp", () => ({
  InputOTP: ({
    children,
    onChange,
    onComplete,
    value = "",
    maxLength = 6,
    ...props
  }: any) => {
    const emit = (raw: string) => {
      const next = String(raw).replace(/\D/g, "").slice(0, maxLength);
      onChange?.(next);
      if (next.length === maxLength) {
        onComplete?.(next);
      }
    };
    return (
      <div data-testid="input-otp-container">
        <input
          data-testid="otp-input"
          aria-label={props["aria-label"] || "Verification code"}
          value={value}
          maxLength={maxLength}
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
          disabled={props.disabled}
          onChange={(e) => emit(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            emit(e.clipboardData.getData("text"));
          }}
        />
        {children}
      </div>
    );
  },
  InputOTPGroup: ({ children }: any) => <div>{children}</div>,
  InputOTPSlot: ({ index }: any) => <div data-testid={`otp-slot-${index}`} />,
}));

vi.mock("../../lib/api", () => ({
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
}));

const startVerification = realStartVerification as unknown as jest.Mock;
const verifyCode = realVerifyCode as unknown as jest.Mock;

async function goToOtpStep(
  zipCode = "12345",
  email = "test@example.com",
) {
  startVerification.mockResolvedValue({ success: true, status: "pending" });
  renderWithTheme(<SubscriptionForm zipCode={zipCode} />);
  const emailInput = screen.getByPlaceholderText(/email/i);
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /sign up for alerts/i }));
  await waitFor(() => {
    expect(screen.getByTestId("otp-input")).toBeInTheDocument();
  });
  return screen.getByTestId("otp-input") as HTMLInputElement;
}

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

  it("associates the email input with a visible label", () => {
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    expect(
      screen.getByRole("textbox", { name: /email address/i })
    ).toBeInTheDocument();
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

  it("shows start date and end date inputs when schedule checkbox is ticked", async () => {
    renderWithTheme(<SubscriptionForm zipCode="12345" />);

    // Date inputs should not be visible initially
    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();

    // Tick the checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    // Both date inputs should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
  });

  it("shows an optional minimum AQI threshold select", () => {
    renderWithTheme(<SubscriptionForm zipCode="12345" />);

    const select = screen.getByRole("combobox", { name: /minimum aqi/i });
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: /moderate \(51\+\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /unhealthy for sensitive groups \(101\+\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /unhealthy \(151\+\)/i })).toBeInTheDocument();
  });

  it("submits the selected minimum AQI threshold with the verification", async () => {
    startVerification.mockResolvedValue({ success: true, status: "pending" });
    renderWithTheme(<SubscriptionForm zipCode="12345" />);
    fireEvent.change(screen.getByRole("combobox", { name: /minimum aqi/i }), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up for alerts/i }));
    await waitFor(() => expect(screen.getByTestId("otp-input")).toBeInTheDocument());

    verifyCode.mockResolvedValue({ success: true, valid: true });
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });

    await waitFor(() => {
      expect(verifyCode).toHaveBeenCalledWith(
        "test@example.com",
        "12345",
        "123456",
        undefined,
        undefined,
        undefined,
        101,
      );
    });
  });

  it("shows validation error for a past start date", async () => {
    startVerification.mockResolvedValue({ success: true });
    renderWithTheme(<SubscriptionForm zipCode="12345" />);

    // Fill email
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // Tick the schedule checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    // Set start date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: yesterdayStr } });

    // Submit the form to advance to OTP step
    const emailInput2 = screen.getByPlaceholderText(/email/i);
    const form = emailInput2.closest("form")!;
    fireEvent.submit(form);

    // Wait for OTP step
    await waitFor(() => {
      expect(screen.getAllByText(/verification code/i).length).toBeGreaterThan(0);
    });

    // Enter 6-digit OTP and try to verify — validation fires before network call
    const otpInput = screen.getByTestId("otp-input");
    fireEvent.change(otpInput, { target: { value: "123456" } });

    const verifyBtn = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/start date must be today or in the future/i)).toBeInTheDocument();
    });
  });

  it("pastes a full code into all 6 OTP boxes", async () => {
    const otpInput = await goToOtpStep();
    // Keep verification pending so the OTP field stays mounted for the assertion
    verifyCode.mockImplementation(() => new Promise(() => {}));

    fireEvent.paste(otpInput, {
      clipboardData: { getData: () => "847291" },
    });

    await waitFor(() => {
      expect(otpInput).toHaveValue("847291");
    });
  });

  it("pastes a formatted code by keeping only digits", async () => {
    const otpInput = await goToOtpStep();
    verifyCode.mockImplementation(() => new Promise(() => {}));

    fireEvent.paste(otpInput, {
      clipboardData: { getData: () => "847-291\n" },
    });

    await waitFor(() => {
      expect(otpInput).toHaveValue("847291");
    });
  });

  it("does not submit verification until all 6 digits are present", async () => {
    const otpInput = await goToOtpStep();
    const form = otpInput.closest("form")!;

    for (const partial of ["1", "12", "123", "1234", "12345"]) {
      fireEvent.change(otpInput, { target: { value: partial } });
      fireEvent.submit(form);
      expect(otpInput).toHaveValue(partial);
    }

    expect(verifyCode).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/too many invalid attempts/i)
    ).not.toBeInTheDocument();
  });

  it("does not lock out from partial entries; a complete valid code still verifies", async () => {
    const otpInput = await goToOtpStep();
    const form = otpInput.closest("form")!;
    verifyCode.mockResolvedValue({ success: true, valid: true });

    for (const partial of ["1", "12", "123", "1234", "12345"]) {
      fireEvent.change(otpInput, { target: { value: partial } });
      fireEvent.submit(form);
    }

    expect(verifyCode).not.toHaveBeenCalled();

    fireEvent.change(otpInput, { target: { value: "654321" } });

    await waitFor(() => {
      expect(verifyCode).toHaveBeenCalledTimes(1);
    });
    expect(verifyCode).toHaveBeenCalledWith(
      "test@example.com",
      "12345",
      "654321",
      undefined,
      undefined,
    );
    expect(
      await screen.findByText(/verification successful/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/too many invalid attempts/i)
    ).not.toBeInTheDocument();
  });

  it("submits a pasted 6-digit code once", async () => {
    const otpInput = await goToOtpStep();
    verifyCode.mockResolvedValue({ success: true, valid: true });

    fireEvent.paste(otpInput, {
      clipboardData: { getData: () => "123456" },
    });

    await waitFor(() => {
      expect(verifyCode).toHaveBeenCalledTimes(1);
    });
    expect(verifyCode).toHaveBeenCalledWith(
      "test@example.com",
      "12345",
      "123456",
      undefined,
      undefined,
    );
  });

  it("does not treat a short onComplete value as an invalid attempt", async () => {
    const otpInput = await goToOtpStep();
    const form = otpInput.closest("form")!;

    fireEvent.change(otpInput, { target: { value: "12" } });
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(verifyCode).not.toHaveBeenCalled();
    expect(otpInput).toHaveValue("12");
    expect(
      screen.queryByText(/too many invalid attempts/i)
    ).not.toBeInTheDocument();
    expect(OTP_LENGTH).toBe(6);
  });
});
