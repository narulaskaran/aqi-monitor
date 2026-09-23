import { vi } from "vitest";
import { renderWithTheme, screen } from "./lib/test-utils";
import App from "./App";
import * as authModule from "./lib/auth";
import { getAirQuality, getSubscriptions } from "./lib/api";

vi.mock("./lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof authModule>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("./lib/api", () => ({
  getAirQuality: vi.fn(),
  getAirQualityForecast: vi.fn(),
  getAirQualityHistory: vi.fn(),
  getSubscriptions: vi.fn(),
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  updateSubscription: vi.fn(),
  getBaseUrl: vi.fn(() => "http://localhost:3000"),
  getApiUrl: vi.fn((path: string) => `http://localhost:3000/api/${path}`),
}));

describe("App subscriptions", () => {
  it("shows a signed-in user's subscriptions without a ZIP lookup", async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isSignedIn: true,
      token: "token-123",
      email: "user@example.com",
      isValidating: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof authModule.useAuth>);
    vi.mocked(getSubscriptions).mockResolvedValue({
      success: true,
      subscriptions: [
        {
          id: "sub-1",
          zipCode: "10001",
          active: true,
          email: "user@example.com",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          activatedAt: "2024-01-01T00:00:00Z",
          lastEmailSentAt: null,
          expiresAt: null,
          minAlertAqi: null,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof getSubscriptions>>);

    renderWithTheme(<App />);

    expect(
      screen.getByRole("heading", { name: /your subscriptions/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("10001")).toBeInTheDocument();
    expect(getAirQuality).not.toHaveBeenCalled();
  });
});
