import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../lib/test-utils";
import { SubscriptionList } from "../SubscriptionList";
import * as authModule from "../../lib/auth";
import * as apiModule from "../../lib/api";

// Mock the auth module
vi.mock("../../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof authModule>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Mock the API module
vi.mock("../../lib/api", () => ({
  getSubscriptions: vi.fn(),
  updateSubscription: vi.fn(),
  getAirQuality: vi.fn(),
  startVerification: vi.fn(),
  verifyCode: vi.fn(),
  getBaseUrl: vi.fn(),
  getApiUrl: vi.fn(),
}));

const mockSubscriptions = [
  {
    id: "sub-1",
    zipCode: "10001",
    active: true,
    email: "user@example.com",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    activatedAt: "2024-01-01T00:00:00Z",
    lastEmailSentAt: null,
    expiresAt: null,
  },
  {
    id: "sub-2",
    zipCode: "90210",
    active: false,
    email: "user@example.com",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    activatedAt: null,
    lastEmailSentAt: null,
    expiresAt: null,
  },
];

describe("SubscriptionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when signed out", () => {
    (authModule.useAuth as any).mockReturnValue({
      isSignedIn: false,
      token: null,
      email: "",
      isValidating: false,
    });

    const { container } = render(<SubscriptionList />);
    expect(container.firstChild).toBeNull();
  });

  it("renders subscription list when signed in", async () => {
    (authModule.useAuth as any).mockReturnValue({
      isSignedIn: true,
      token: "test-token",
      email: "user@example.com",
      isValidating: false,
    });

    (apiModule.getSubscriptions as any).mockResolvedValue({
      success: true,
      subscriptions: mockSubscriptions,
    });

    render(<SubscriptionList />);

    await waitFor(() => {
      expect(screen.getByText("10001")).toBeInTheDocument();
      expect(screen.getByText("90210")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
  });

  it("opens confirmation modal on toggle click and confirms", async () => {
    (authModule.useAuth as any).mockReturnValue({
      isSignedIn: true,
      token: "test-token",
      email: "user@example.com",
      isValidating: false,
    });

    (apiModule.getSubscriptions as any).mockResolvedValue({
      success: true,
      subscriptions: mockSubscriptions,
    });

    (apiModule.updateSubscription as any).mockResolvedValue({
      success: true,
      subscription: { ...mockSubscriptions[0], active: false },
    });

    render(<SubscriptionList />);

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText("10001")).toBeInTheDocument();
    });

    // Click the deactivate button for sub-1
    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

    // Confirmation modal should appear
    expect(screen.getByText(/Deactivate subscription for ZIP code 10001/i)).toBeInTheDocument();

    // Click Confirm
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(apiModule.updateSubscription).toHaveBeenCalledWith(
        "test-token",
        "sub-1",
        false,
      );
    });

    // Modal should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Deactivate subscription for ZIP code 10001/i)).not.toBeInTheDocument();
    });
  });

  it("closes modal on cancel without calling updateSubscription", async () => {
    (authModule.useAuth as any).mockReturnValue({
      isSignedIn: true,
      token: "test-token",
      email: "user@example.com",
      isValidating: false,
    });

    (apiModule.getSubscriptions as any).mockResolvedValue({
      success: true,
      subscriptions: mockSubscriptions,
    });

    render(<SubscriptionList />);

    await waitFor(() => {
      expect(screen.getByText("10001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    expect(screen.getByText(/Deactivate subscription for ZIP code 10001/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Deactivate subscription for ZIP code 10001/i)).not.toBeInTheDocument();
    });

    expect(apiModule.updateSubscription).not.toHaveBeenCalled();
  });
});
