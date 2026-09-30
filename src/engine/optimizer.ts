import { outsideRespPerSchoolYear, respYears, totalSchoolCost } from "./plan";
import { simulate } from "./simulate";
import type { Inputs, Result } from "./types";

export type StrategyKeys =
  | "respStartAge"
  | "respPerYear"
  | "parentTfsaPerSchoolYear"
  | "topUpRespFromParent";

export interface OptimizerResult {
  strategy: Pick<Inputs, StrategyKeys>;
  result: Result;
  evaluated: number;
}

/** Grid search over contribution strategies; maximizes the real annuity within the school budget. */
export function optimize(base: Inputs): OptimizerResult {
  const startAges: number[] = [];
  for (let a = Math.max(0, base.schoolStartAge - 5); a <= base.schoolStartAge; a++) startAges.push(a);

  let best: OptimizerResult | null = null;
  let evaluated = 0;
  for (const respStartAge of startAges) {
    const years = respYears({ ...base, respStartAge });
    const maxResp = years > 0 ? totalSchoolCost(base) / years : 0;
    const respAmounts = [...new Set([2_500, 5_000, maxResp].map((v) => Math.min(v, maxResp)))];
    for (const respPerYear of respAmounts) {
      const outside = outsideRespPerSchoolYear({ ...base, respStartAge, respPerYear });
      for (const parentTfsaPerSchoolYear of [...new Set([0, outside])]) {
        for (const topUpRespFromParent of [false, true]) {
          const strategy = { respStartAge, respPerYear, parentTfsaPerSchoolYear, topUpRespFromParent };
          const result = simulate({ ...base, ...strategy });
          evaluated++;
          if (result.unrepaidAdvanceReal > 1) continue;
          if (!best || result.annuityReal > best.result.annuityReal + 1e-6) {
            best = { strategy, result, evaluated: 0 };
          }
        }
      }
    }
  }
  if (!best) {
    const strategy = {
      respStartAge: base.respStartAge,
      respPerYear: base.respPerYear,
      parentTfsaPerSchoolYear: base.parentTfsaPerSchoolYear,
      topUpRespFromParent: base.topUpRespFromParent,
    };
    best = { strategy, result: simulate(base), evaluated: 0 };
  }
  best.evaluated = evaluated;
  return best;
}

export interface SensitivityGrid {
  returns: number[];
  payoutRates: number[];
  /** annuityReal[i][j] for returns[i] and payoutRates[j] */
  annuityReal: number[][];
}

export function sensitivity(base: Inputs, returns: number[], payoutRates: number[]): SensitivityGrid {
  const annuityReal = returns.map((rr) => {
    const capitalReal = simulate({ ...base, realReturn: rr }).capitalAtAnnuityReal;
    return payoutRates.map((pr) => capitalReal * pr);
  });
  return { returns, payoutRates, annuityReal };
}
