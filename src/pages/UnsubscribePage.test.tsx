import { vi } from "vitest";
import { renderWithRouter, screen, waitFor } from "../lib/test-utils";
import { UnsubscribePage } from "./UnsubscribePage";

describe("UnsubscribePage", () => {
  beforeEach(() => {
    // @ts-expect-error - vi is not defined in the global scope
    global.fetch = undefined;
  });

  it("shows error for missing token or subscription_id", async () => {
    renderWithRouter(<UnsubscribePage />, { initialEntries: ["/unsubscribe"] });
    await waitFor(() => {
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Invalid unsubscribe link. Please try again or contact support."
        )
      ).toBeInTheDocument();
    });
  });

  it("shows error for API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "API error" }),
    });
    renderWithRouter(<UnsubscribePage />, {
      initialEntries: ["/unsubscribe?token=t&subscription_id=id"],
    });
    await waitFor(() => {
      screen.debug();
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument();
      expect(
        screen.queryAllByText((content) =>
          content.toLowerCase().includes("http error")
        ).length
      ).toBeGreaterThan(0);
    });
  });

  it("shows success for successful unsubscribe", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    renderWithRouter(<UnsubscribePage />, {
      initialEntries: ["/unsubscribe?token=t&subscription_id=id"],
    });
    await waitFor(() => {
      screen.debug();
      expect(
        screen.queryAllByText((content) =>
          content.includes("Successfully Unsubscribed")
        ).length
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByText((content) =>
          content.includes(
            "You have been successfully unsubscribed from air quality alerts."
          )
        ).length
      ).toBeGreaterThan(0);
    });
  });
});
