import { vi } from "vitest";
import {
  renderWithTheme,
  screen,
  fireEvent,
  waitFor,
} from "../../lib/test-utils";
import AdminControls from "../AdminControls";

describe("AdminControls", () => {
  beforeEach(() => {
    // @ts-expect-error - vitest is not defined in the global scope
    global.fetch = undefined;
  });

  it("renders without crashing", () => {
    renderWithTheme(<AdminControls />);
  });

  it("renders API key input and trigger button", () => {
    renderWithTheme(<AdminControls />);
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /trigger/i })
    ).toBeInTheDocument();
  });

  it("allows typing in the API key field", () => {
    renderWithTheme(<AdminControls />);
    const input = screen.getByLabelText(/api key/i);
    fireEvent.change(input, { target: { value: "secret" } });
    expect(input).toHaveValue("secret");
  });

  it("shows error alert on API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid API key" }),
    });
    renderWithTheme(<AdminControls />);
    fireEvent.click(screen.getByRole("button", { name: /trigger/i }));
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
    });
  });

  it("shows success alert on API success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Cron job triggered" }),
    });
    renderWithTheme(<AdminControls />);
    fireEvent.click(screen.getByRole("button", { name: /trigger/i }));
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
      expect(screen.getByText(/cron job triggered/i)).toBeInTheDocument();
    });
  });
});
