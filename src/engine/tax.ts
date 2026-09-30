import { PARAMS_2026, type Bracket, type Params } from "./params2026";

function bracketTax(income: number, brackets: readonly Bracket[], index: number): number {
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upTo * index;
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * b.rate;
    lower = upper;
  }
  return tax;
}

/** Federal tax net of the Quebec abatement. `index` scales 2026 thresholds (inflation indexation). */
export function federalTax(income: number, index = 1, p: Params = PARAMS_2026): number {
  if (income <= 0) return 0;
  const f = p.federal;
  const phaseStart = f.bpaPhaseStart * index;
  const phaseEnd = f.bpaPhaseEnd * index;
  let bpa = f.bpaMax * index;
  if (income >= phaseEnd) bpa = f.bpaMin * index;
  else if (income > phaseStart) {
    bpa -= ((income - phaseStart) / (phaseEnd - phaseStart)) * (f.bpaMax - f.bpaMin) * index;
  }
  const basic = Math.max(0, bracketTax(income, f.brackets, index) - bpa * f.creditRate);
  return basic * (1 - f.quebecAbatement);
}

export function quebecTax(income: number, index = 1, p: Params = PARAMS_2026): number {
  if (income <= 0) return 0;
  const q = p.quebec;
  return Math.max(0, bracketTax(income, q.brackets, index) - q.bpa * index * q.creditRate);
}

export function incomeTax(income: number, index = 1, p: Params = PARAMS_2026): number {
  return federalTax(income, index, p) + quebecTax(income, index, p);
}

export interface TaxBreakdown {
  /** Federal and Quebec tax on baseIncome + extra */
  federal: number;
  quebec: number;
  /** Tax on baseIncome alone */
  withoutProject: number;
  /** federal + quebec - withoutProject */
  tax: number;
}

export function taxBreakdown(baseIncome: number, extra: number, index = 1, p: Params = PARAMS_2026): TaxBreakdown {
  const total = baseIncome + Math.max(0, extra);
  const federal = federalTax(total, index, p);
  const quebec = quebecTax(total, index, p);
  const withoutProject = incomeTax(baseIncome, index, p);
  return { federal, quebec, withoutProject, tax: extra > 0 ? federal + quebec - withoutProject : 0 };
}

/** Tax on `extra` income stacked on top of `baseIncome`. */
export function incrementalTax(baseIncome: number, extra: number, index = 1, p: Params = PARAMS_2026): number {
  if (extra <= 0) return 0;
  return incomeTax(baseIncome + extra, index, p) - incomeTax(baseIncome, index, p);
}

export function marginalRate(income: number, index = 1, p: Params = PARAMS_2026): number {
  const step = 100 * index;
  return (incomeTax(income + step, index, p) - incomeTax(income, index, p)) / step;
}
