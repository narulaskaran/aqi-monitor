import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useState } from "react";
import { renderWithTheme } from "../../lib/test-utils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "./input-otp";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

function ControlledOtp({
  onComplete,
}: {
  onComplete?: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      aria-label="Verification code"
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

describe("InputOTP", () => {
  it("pastes a full 6-digit code into the hidden input", async () => {
    render(<ControlledOtp />);
    const input = screen.getByRole("textbox", { name: /verification code/i });

    fireEvent.paste(input, {
      clipboardData: { getData: () => "847291" },
    });

    await waitFor(() => {
      expect(input).toHaveValue("847291");
    });
  });

  it("strips non-digits when pasting a formatted code", async () => {
    render(<ControlledOtp />);
    const input = screen.getByRole("textbox", { name: /verification code/i });

    fireEvent.paste(input, {
      clipboardData: { getData: () => "847-291\n" },
    });

    await waitFor(() => {
      expect(input).toHaveValue("847291");
    });
  });

  it("does not call onComplete until all 6 digits are present", async () => {
    const onComplete = vi.fn();
    render(<ControlledOtp onComplete={onComplete} />);
    const input = screen.getByRole("textbox", { name: /verification code/i });

    fireEvent.change(input, { target: { value: "12345" } });
    expect(onComplete).not.toHaveBeenCalled();
    expect(input).toHaveValue("12345");

    fireEvent.change(input, { target: { value: "123456" } });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("hides decorative OTP slots from assistive technology", () => {
    const { container } = renderWithTheme(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    );

    const slots = container.querySelectorAll("[aria-hidden='true']");
    expect(slots).toHaveLength(6);
    expect(screen.queryByLabelText(/digit/i)).not.toBeInTheDocument();
  });

  it("labels the OTP input when no labelledby is provided", () => {
    renderWithTheme(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    );

    expect(
      screen.getByRole("textbox", { name: /verification code/i })
    ).toBeInTheDocument();
  });
});
