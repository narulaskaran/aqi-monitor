import { airQualityEmail } from "../_lib/templates/email/index.js";

describe("Email Template", () => {
  it("should generate the unsubscribe link with subscription_id and token", () => {
    const params = {
      zipCode: "12345",
      aqi: 50,
      isGoodAirQuality: true,
      unsubscribeToken: "test_token",
      websiteUrl: "http://localhost:5173",
      subscriptionId: "sub-123",
    };

    const emailHtml = airQualityEmail(params);
    const expectedLink = `${params.websiteUrl}/unsubscribe?subscription_id=${params.subscriptionId}&token=${params.unsubscribeToken}`;
    expect(emailHtml).toContain(expectedLink);
  });
});