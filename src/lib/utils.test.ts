import * as utils from "./utils";
import { getAQIColor } from "./utils";

describe("utils", () => {
  it("should be defined", () => {
    expect(utils).toBeDefined();
  });
});

describe("getAQIColor", () => {
  it("returns EPA-band Tailwind background classes", () => {
    expect(getAQIColor(0)).toBe("bg-green-100");
    expect(getAQIColor(50)).toBe("bg-green-100");
    expect(getAQIColor(51)).toBe("bg-yellow-100");
    expect(getAQIColor(100)).toBe("bg-yellow-100");
    expect(getAQIColor(101)).toBe("bg-orange-100");
    expect(getAQIColor(150)).toBe("bg-orange-100");
    expect(getAQIColor(151)).toBe("bg-red-100");
    expect(getAQIColor(200)).toBe("bg-red-100");
    expect(getAQIColor(201)).toBe("bg-purple-100");
    expect(getAQIColor(300)).toBe("bg-purple-100");
    expect(getAQIColor(301)).toBe("bg-maroon-100");
  });
});
