import type { Inputs } from "./types";

// All amounts in constant dollars.

export const schoolEndAge = (inp: Inputs) => inp.schoolStartAge + inp.schoolYears - 1;

/** Years of RESP contributions: from the first RESP age to the end of high school. */
export const respYears = (inp: Inputs) => Math.max(0, schoolEndAge(inp) - inp.respStartAge + 1);

/** RESP contribution years before high school (their cost is taken from later school budgets). */
export const earlyRespYears = (inp: Inputs) => Math.max(0, inp.schoolStartAge - inp.respStartAge);

export const totalSchoolCost = (inp: Inputs) => inp.schoolCostPerYear * inp.schoolYears;

export const respTotal = (inp: Inputs) => inp.respPerYear * respYears(inp);

/** School budget left each school year once the RESP share is taken out. */
export const outsideRespPerSchoolYear = (inp: Inputs) =>
  inp.schoolYears > 0 ? Math.max(0, (totalSchoolCost(inp) - respTotal(inp)) / inp.schoolYears) : 0;

export const parentNonRegPerSchoolYear = (inp: Inputs) =>
  Math.max(0, outsideRespPerSchoolYear(inp) - inp.parentTfsaPerSchoolYear);

export const maxRespPerYear = (inp: Inputs) => {
  const years = respYears(inp);
  return years > 0 ? totalSchoolCost(inp) / years : 0;
};
