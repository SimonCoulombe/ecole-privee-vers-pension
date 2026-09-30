import type { Inputs } from "./types";

export const HOME_AGE = 30;
export const ANNUITY_AGE = 65;

export const DEFAULT_INPUTS: Inputs = {
  schoolCostPerYear: 8_000,
  schoolStartAge: 12,
  schoolYears: 5,

  respStartAge: 12,
  respPerYear: 0,
  parentTfsaPerSchoolYear: 8_000,
  topUpRespFromParent: false,

  parentMarginalRate: 0.4571,
  parentMarginalRateAtTransfer: 0.4571,
  emptyParentTfsaAt18: false,

  pseEnabled: true,
  pseStartAge: 17,
  pseYears: 5,
  studentJobIncome: 5_000,
  workIncomeAfterStudies: 60_000,

  realReturn: 0.06,
  inflation: 0.02,
  distributionYield: 0.02,

  annuityPayoutRate: 0.066,
};
