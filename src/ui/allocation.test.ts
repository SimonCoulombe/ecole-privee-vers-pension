import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS } from "../engine/defaults";
import { outsideRespPerSchoolYear, parentNonRegPerSchoolYear, respTotal } from "../engine/plan";
import { applyChange, normalizeAllocation } from "./allocation";

describe("allocation", () => {
  it("follows the example: start at 10, $5,000/yr", () => {
    const inp = normalizeAllocation({ ...DEFAULT_INPUTS, respStartAge: 10, respPerYear: 5_000, parentTfsaPerSchoolYear: 0 });
    expect(respTotal(inp)).toBe(35_000);
    expect(outsideRespPerSchoolYear(inp)).toBe(1_000);
    expect(parentNonRegPerSchoolYear(inp)).toBe(1_000);
    expect(parentNonRegPerSchoolYear({ ...inp, parentTfsaPerSchoolYear: 400 })).toBe(600);
  });

  it("starting at 9 with $5,000/yr leaves nothing outside the RESP", () => {
    const next = applyChange(DEFAULT_INPUTS, "respStartAge", 9);
    expect(respTotal(next)).toBe(40_000);
    expect(next.parentTfsaPerSchoolYear).toBe(0);
    expect(parentNonRegPerSchoolYear(next)).toBe(0);
  });

  it("lowering the RESP leaves the TFSA alone and grows non-registered", () => {
    const next = applyChange(DEFAULT_INPUTS, "respPerYear", 4_000);
    expect(next.parentTfsaPerSchoolYear).toBe(3_000);
    expect(parentNonRegPerSchoolYear(next)).toBe(1_000);
  });

  it("raising the RESP shrinks the TFSA to fit (RESP has priority)", () => {
    const next = applyChange(DEFAULT_INPUTS, "respPerYear", 6_000);
    expect(next.respPerYear).toBe(6_000);
    expect(next.parentTfsaPerSchoolYear).toBe(2_000);
    expect(applyChange(DEFAULT_INPUTS, "respPerYear", 9_000).respPerYear).toBe(8_000);
  });

  it("lets the RESP go up even when the TFSA took the whole budget", () => {
    const start = { ...DEFAULT_INPUTS, respPerYear: 0, parentTfsaPerSchoolYear: 8_000, respStartAge: 9 };
    const next = applyChange(start, "respPerYear", 5_000);
    expect(next.respPerYear).toBe(5_000);
    expect(next.parentTfsaPerSchoolYear).toBe(0);
  });

  it("caps the TFSA at the part outside the RESP", () => {
    expect(applyChange(DEFAULT_INPUTS, "parentTfsaPerSchoolYear", 9_000).parentTfsaPerSchoolYear).toBe(3_000);
  });

  it("never goes negative", () => {
    expect(applyChange(DEFAULT_INPUTS, "respPerYear", -100).respPerYear).toBe(0);
    expect(applyChange(DEFAULT_INPUTS, "parentTfsaPerSchoolYear", -100).parentTfsaPerSchoolYear).toBe(0);
  });

  it("caps amounts when the school cost drops, RESP first", () => {
    const next = applyChange(DEFAULT_INPUTS, "schoolCostPerYear", 4_000);
    expect(next.respPerYear).toBe(4_000);
    expect(next.parentTfsaPerSchoolYear).toBe(0);
  });
});
