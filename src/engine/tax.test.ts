import { describe, expect, it } from "vitest";
import { federalTax, incomeTax, marginalRate, quebecTax } from "./tax";

describe("tax 2026", () => {
  it("is zero for a student earning $10,000", () => {
    expect(incomeTax(10_000)).toBe(0);
  });

  it("is zero just under both basic personal amounts", () => {
    expect(federalTax(16_452)).toBe(0);
    expect(quebecTax(18_952)).toBe(0);
  });

  it("applies the Quebec abatement to federal tax", () => {
    // (20,000 - 16,452) * 14 % * (1 - 16.5 %)
    expect(federalTax(20_000)).toBeCloseTo(3_548 * 0.14 * 0.835, 2);
  });

  it("gives expected combined marginal rates", () => {
    expect(marginalRate(80_000)).toBeCloseTo(0.205 * 0.835 + 0.19, 3);
    expect(marginalRate(125_000)).toBeCloseTo(0.26 * 0.835 + 0.24, 3);
    expect(marginalRate(300_000)).toBeCloseTo(0.33 * 0.835 + 0.2575, 3);
  });

  it("scales thresholds with the indexation factor", () => {
    expect(incomeTax(20_000 * 2, 2)).toBeCloseTo(incomeTax(20_000) * 2, 6);
  });
});
