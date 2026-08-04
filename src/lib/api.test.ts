import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api utils", () => {
  it("should be defined", () => {
    expect(api).toBeDefined();
  });

  it("surfaces the API error when updating a subscription fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi
          .fn()
          .mockResolvedValue({ error: "An active subscription already exists" }),
      }),
    );

    await expect(api.updateSubscription("token", "subscription-id", true))
      .rejects.toThrow("An active subscription already exists");
  });
});
