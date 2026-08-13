import * as utils from "./utils";

describe("utils", () => {
  it("should be defined", () => {
    expect(utils).toBeDefined();
  });

  it("normalizeOtpCode keeps only the first 6 digits", () => {
    expect(utils.normalizeOtpCode("847291")).toBe("847291");
    expect(utils.normalizeOtpCode("847-291")).toBe("847291");
    expect(utils.normalizeOtpCode(" 8 4 7 2 9 1 \n")).toBe("847291");
    expect(utils.normalizeOtpCode("12")).toBe("12");
    expect(utils.normalizeOtpCode("1234567890")).toBe("123456");
    expect(utils.normalizeOtpCode("abc")).toBe("");
  });
});
