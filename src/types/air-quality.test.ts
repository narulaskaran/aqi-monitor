import { AQI_CATEGORIES, getAQICategory } from "./air-quality";

describe("getAQICategory", () => {
  const expectedByBand: Array<{
    name: keyof typeof AQI_CATEGORIES;
    indexes: number[];
  }> = [
    { name: "Good", indexes: [0, 25, 50] },
    { name: "Moderate", indexes: [51, 75, 100] },
    { name: "Unhealthy for Sensitive Groups", indexes: [101, 125, 150] },
    { name: "Unhealthy", indexes: [151, 175, 200] },
    { name: "Very Unhealthy", indexes: [201, 250, 300] },
    { name: "Hazardous", indexes: [301, 400, 500, 501] },
  ];

  it.each(expectedByBand)(
    "maps $name AQI indexes to EPA color and health recommendation",
    ({ name, indexes }) => {
      const expected = AQI_CATEGORIES[name];

      for (const index of indexes) {
        const result = getAQICategory("", index);
        expect(result.name).toBe(expected.name);
        expect(result.color).toBe(expected.color);
        expect(result.textColor).toBe(expected.textColor);
        expect(result.advice).toBe(expected.advice);
        expect(result.advice.length).toBeGreaterThan(0);
      }
    },
  );

  it("resolves each known category name to its EPA mapping", () => {
    for (const [name, expected] of Object.entries(AQI_CATEGORIES)) {
      const midpoint =
        expected.range[0] >= 0
          ? Math.floor((expected.range[0] + expected.range[1]) / 2)
          : 0;
      expect(getAQICategory(name, midpoint)).toEqual(expected);
    }
  });

  it("matches category names case-insensitively and with API-style variants", () => {
    expect(getAQICategory("moderate", 0).name).toBe("Moderate");
    expect(getAQICategory("MODERATE", 0).name).toBe("Moderate");
    expect(getAQICategory("Moderate air quality", 0).name).toBe("Moderate");
    expect(getAQICategory("UNHEALTHY_FOR_SENSITIVE_GROUPS", 0).name).toBe(
      "Unhealthy for Sensitive Groups",
    );
  });

  it("prefers an explicit category name over a conflicting index", () => {
    const result = getAQICategory("Hazardous", 40);
    expect(result).toEqual(AQI_CATEGORIES.Hazardous);
  });

  it("falls back to Unknown for invalid index and unrecognized category", () => {
    expect(getAQICategory("", -10)).toEqual(AQI_CATEGORIES.Unknown);
    expect(getAQICategory("not-a-real-category", Number.NaN)).toEqual(
      AQI_CATEGORIES.Unknown,
    );
  });

  it("uses the Unknown mapping when the API reports Unknown", () => {
    expect(getAQICategory("Unknown", 0)).toEqual(AQI_CATEGORIES.Unknown);
  });
});
