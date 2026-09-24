import { vi } from "vitest";
import { renderWithRouter, screen, waitFor } from "../lib/test-utils";
import { UnsubscribePage } from "./UnsubscribePage";

describe("UnsubscribePage", () => {
  beforeEach(() => {
    // @ts-expect-error - Mocking fetch
    global.fetch = undefined;
  });

  it("shows error for missing token", async () => {
    renderWithRouter(<UnsubscribePage />, { initialEntries: ["/unsubscribe"] });
    await waitFor(() => {
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Invalid unsubscribe link. Please try again or contact support."
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("shows error for API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "API error" }),
    });
    renderWithRouter(<UnsubscribePage />, {
      initialEntries: ["/unsubscribe?token=t"],
    });
    await waitFor(() => {
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument();
      expect(screen.getByText(/http error! status:/i)).toBeInTheDocument();
    });
  });

  it("shows success for successful unsubscribe", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    renderWithRouter(<UnsubscribePage />, {
      initialEntries: ["/unsubscribe?token=t"],
    });
    await waitFor(() => {
      expect(screen.getByText("Successfully Unsubscribed")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You have been successfully unsubscribed from air quality alerts."
        )
      ).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer t",
        }),
        body: "{}",
        credentials: "include",
      }),
    );
  });

  it("exposes a live status while the request is pending", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderWithRouter(<UnsubscribePage />, {
      initialEntries: ["/unsubscribe?token=synthetic-token"],
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Processing your unsubscribe request...",
    );
  });
});
