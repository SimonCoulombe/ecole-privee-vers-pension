import { describe, expect, it } from "vitest";
import { ANNUITY_AGE, DEFAULT_INPUTS, HOME_AGE } from "./defaults";
import { optimize } from "./optimizer";
import { grantsForYear, initialGrantState } from "./resp";
import { simulate } from "./simulate";
import { ACCOUNTS } from "./types";

describe("RESP grants", () => {
  it("starts with $2,500 of room per year since birth ((1 + age) × $2,500 in the first year)", () => {
    const s = initialGrantState(12);
    expect(s.room + 2_500).toBe(32_500);
    expect(initialGrantState(9).room + 2_500).toBe(25_000);
    expect(s.cesgReceived).toBe(0);
  });

  it("caps a year at $1,000 CESG + $500 QESI", () => {
    const s = initialGrantState(12);
    expect(grantsForYear(s, 12, 8_000)).toEqual({ cesg: 1_000, qesi: 500, eligible: 5_000 });
  });

  it("gives nothing after the year the child turns 17", () => {
    const s = initialGrantState(12);
    expect(grantsForYear(s, 18, 5_000)).toEqual({ cesg: 0, qesi: 0, eligible: 0 });
  });

  it("refuses grants at 16-17 without $2,000 contributed by 15", () => {
    const s = initialGrantState(16);
    expect(grantsForYear(s, 16, 5_000)).toEqual({ cesg: 0, qesi: 0, eligible: 0 });
  });
});

describe("simulate", () => {
  it("collects $7,500 of grants with the default split (start at 12, no top-up)", () => {
    expect(simulate(DEFAULT_INPUTS).totalGrants).toBeCloseTo(7_500, 6);
  });

  it("collects $9,000 when topping up at 17", () => {
    expect(simulate({ ...DEFAULT_INPUTS, topUpRespFromParent: true }).totalGrants).toBeCloseTo(9_000, 6);
  });

  it("tops up the RESP only at 17, from the parent TFSA first, then the parent non-registered account", () => {
    const r = simulate({ ...DEFAULT_INPUTS, respPerYear: 2_500, parentTfsaPerSchoolYear: 500, topUpRespFromParent: true });
    for (const row of r.rows) {
      if (row.age !== 17) {
        expect(row.transferToResp).toBe(0);
        expect(row.transfers.some((t) => t.to === "resp" && (t.from === "parentTfsa" || t.from === "parentNonReg"))).toBe(false);
      }
    }
    const at17 = r.rows.find((row) => row.age === 17)!;
    const sumT = (from: string) => at17.transfers.filter((t) => t.from === from && t.to === "resp").reduce((s, t) => s + t.amount, 0);
    expect(at17.parentTfsa).toBeCloseTo(0, 6);
    expect(sumT("parentNonReg")).toBeGreaterThan(0);
    expect(sumT("parentTfsa") + sumT("parentNonReg")).toBeCloseTo(at17.transferToResp, 6);
    // The $5,000 grant-eligible cap is not indexed
    expect(at17.contribResp + at17.transferToResp).toBeCloseTo(5_000, 4);
  });

  it("collects the full $10,800 when starting at 10 with the age-17 transfer", () => {
    const r = simulate({
      ...DEFAULT_INPUTS,
      respPerYear: 5_000,
      parentTfsaPerSchoolYear: 1_000,
      respStartAge: 10,
      topUpRespFromParent: true,
    });
    expect(r.totalGrants).toBeCloseTo(10_800, 6);
  });

  const allInResp = { ...DEFAULT_INPUTS, respPerYear: 5_000, parentTfsaPerSchoolYear: 0 };

  it("collects the full $10,800 when starting at 9 without the age-17 transfer", () => {
    expect(simulate({ ...allInResp, respStartAge: 9 }).totalGrants).toBeCloseTo(10_800, 6);
    expect(simulate({ ...allInResp, respStartAge: 10 }).totalGrants).toBeCloseTo(10_500, 6);
  });

  it("puts 8 x $5,000 from age 9 in the RESP and nothing in the non-registered account", () => {
    for (const inflation of [0, 0.021]) {
      const r = simulate({ ...allInResp, respStartAge: 9, inflation });
      expect(r.unrepaidAdvanceReal).toBeCloseTo(0, 6);
      for (const row of r.rows.filter((x) => x.age <= 16)) {
        expect(row.contribResp / row.deflator).toBeCloseTo(5_000, 6);
        expect(row.contribParentNonReg).toBeCloseTo(0, 6);
      }
    }
  });

  it("does not add RESP contributions when the RESP amount is 0", () => {
    const r = simulate({ ...DEFAULT_INPUTS, respPerYear: 0, parentTfsaPerSchoolYear: 8_000, respStartAge: 9 });
    expect(r.rows.every((row) => row.contribResp === 0)).toBe(true);
    expect(r.totalGrants).toBe(0);
  });

  it("empties the RESP by the end of post-secondary studies", () => {
    const r = simulate(DEFAULT_INPUTS);
    const lastPse = r.rows.find((row) => row.age === DEFAULT_INPUTS.pseStartAge + DEFAULT_INPUTS.pseYears - 1)!;
    expect(lastPse.resp).toBeCloseTo(0, 6);
  });

  it("matches a closed-form future value when everything stays in TFSAs", () => {
    const inp = {
      ...DEFAULT_INPUTS,
      inflation: 0,
      respPerYear: 0,
      parentTfsaPerSchoolYear: 8_000,
    };
    const r = simulate(inp);
    const years = ANNUITY_AGE - inp.schoolStartAge;
    let fv = 0;
    for (let k = 0; k < inp.schoolYears; k++) fv += 8_000 * Math.pow(1.06, years - k);
    expect(r.capitalAtAnnuityReal).toBeCloseTo(fv, 4);
  });

  it("values the down payment at 30 as the net value if everything is sold at the end of age 29", () => {
    const r = simulate(DEFAULT_INPUTS);
    const row29 = r.rows.find((row) => row.age === HOME_AGE - 1)!;
    expect(r.homeDownPaymentReal).toBeGreaterThan(0);
    expect(r.homeDownPaymentReal).toBeCloseTo(row29.endLiquidation.value / row29.endDeflator, 6);
    expect(r.homeDownPaymentReal).toBeLessThanOrEqual(row29.total / row29.endDeflator + 1e-6);
    const last = r.rows[r.rows.length - 1];
    expect(last.endLiquidation.value).toBeCloseTo(r.capitalAtAnnuityNominal, 6);
  });

  it("last row balances, in today's $, equal the capital at the annuity age before liquidation tax", () => {
    const r = simulate(DEFAULT_INPUTS);
    const last = r.rows[r.rows.length - 1];
    expect(last.age + 1).toBe(ANNUITY_AGE);
    expect(last.total / last.endDeflator).toBeCloseTo(r.capitalAtAnnuityReal + r.liquidationTaxReal, 4);
  });

  it("logs grants and the final annuity purchase consistently with the totals", () => {
    const r = simulate({ ...DEFAULT_INPUTS, inflation: 0 });
    const grants = r.rows.flatMap((row) => row.transfers).filter((tr) => tr.from === "gouv");
    expect(grants.reduce((s, tr) => s + tr.amount / tr.deflator, 0)).toBeCloseTo(r.totalGrants, 6);
    const purchase = r.finalTransfers.find((tr) => tr.to === "rente")!;
    expect(purchase.amount / purchase.deflator).toBeCloseTo(r.capitalAtAnnuityReal, 6);
  });

  it("empties the parent TFSA at 18 when asked", () => {
    const inp = { ...DEFAULT_INPUTS, emptyParentTfsaAt18: true };
    const r = simulate(inp);
    const at18 = r.rows.find((row) => row.age === 18)!;
    expect(at18.parentTfsa).toBe(0);
    expect(at18.childNonReg).toBeGreaterThan(0);
    expect(r.capitalAtAnnuityReal).toBeLessThanOrEqual(simulate(DEFAULT_INPUTS).capitalAtAnnuityReal);
  });

  it("reconciles every account every year: open + in - out + growth = close", () => {
    const scenarios = [
      DEFAULT_INPUTS,
      { ...DEFAULT_INPUTS, topUpRespFromParent: true, parentTfsaPerSchoolYear: 1_000 },
      { ...DEFAULT_INPUTS, pseEnabled: false },
      { ...DEFAULT_INPUTS, emptyParentTfsaAt18: true },
      { ...DEFAULT_INPUTS, respStartAge: 9, parentTfsaPerSchoolYear: 0 },
      { ...DEFAULT_INPUTS, respPerYear: 0, parentTfsaPerSchoolYear: 0 },
    ];
    for (const inp of scenarios) {
      const r = simulate(inp);
      let prevClose: Record<string, number> | null = null;
      for (const row of r.rows) {
        for (const acc of ACCOUNTS) {
          const l = row.ledger[acc];
          expect(l.open + l.in - l.out + l.growth).toBeCloseTo(row[acc], 4);
          // In today's $, growth is exactly (open + in - out) x real return
          const base = (l.open + l.in - l.out) / row.deflator;
          expect(row[acc] / row.endDeflator - base).toBeCloseTo(base * inp.realReturn, 4);
          if (prevClose) expect(l.open).toBeCloseTo(prevClose[acc], 4);
        }
        expect(row.childTaxFederal + row.childTaxQuebec - row.childTaxWithoutProject).toBeCloseTo(row.taxChild, 4);
        expect(row.parentGainTax + row.parentDistTax).toBeCloseTo(row.taxParent, 4);
        prevClose = { ...Object.fromEntries(ACCOUNTS.map((a) => [a, row[a]])) };
      }
    }
  });

  it("loses grants and pays the AIP penalty when there are no post-secondary studies", () => {
    const withPse = simulate(DEFAULT_INPUTS);
    const without = simulate({ ...DEFAULT_INPUTS, pseEnabled: false });
    expect(without.rows.some((row) => row.grantsRepaid > 0 && row.aipTax > 0)).toBe(true);
    expect(without.annuityReal).toBeLessThan(withPse.annuityReal);
  });
});

describe("optimizer", () => {
  it("never does worse than the default strategy", () => {
    const best = optimize(DEFAULT_INPUTS);
    expect(best.result.annuityReal).toBeGreaterThanOrEqual(simulate(DEFAULT_INPUTS).annuityReal - 1e-6);
    expect(best.result.unrepaidAdvanceReal).toBeLessThanOrEqual(1);
  });
});
