export interface Inputs {
  // School scenario (today's $)
  schoolCostPerYear: number;
  schoolStartAge: number;
  schoolYears: number;

  // Contribution strategy (today's $, indexed like the school cost)
  respStartAge: number;
  /** Paid every year from respStartAge to the end of high school */
  respPerYear: number;
  parentTfsaPerSchoolYear: number;
  topUpRespFromParent: boolean;

  // Parents
  parentMarginalRate: number;
  parentMarginalRateAtTransfer: number;
  emptyParentTfsaAt18: boolean;

  // Child
  pseEnabled: boolean;
  pseStartAge: number;
  pseYears: number;
  studentJobIncome: number;
  workIncomeAfterStudies: number;

  // Markets (annual rates, decimals); realReturn is net of fees
  realReturn: number;
  inflation: number;
  distributionYield: number;

  // Annuity
  annuityPayoutRate: number;
}

export type Place =
  | "budget" | "avance" | "gouv" | "resp" | "parentTfsa" | "parentNonReg"
  | "child" | "childTfsa" | "childNonReg" | "impot" | "comptes" | "rente";

export interface Transfer {
  from: Place;
  to: Place;
  /** Nominal amount; divide by `deflator` for constant dollars. */
  amount: number;
  deflator: number;
  note: string;
}

export const ACCOUNTS = ["resp", "parentTfsa", "parentNonReg", "childTfsa", "childNonReg"] as const;
export type AccountKey = (typeof ACCOUNTS)[number];

/** Nominal flows of one account during a year: open + in - out + growth = closing balance. */
export interface LedgerEntry {
  open: number;
  in: number;
  out: number;
  growth: number;
}

/** Selling every investment at the start of an age (nominal $). */
export interface Liquidation {
  baseIncome: number;
  unrealizedGains: number;
  taxableGains: number;
  federal: number;
  quebec: number;
  withoutProject: number;
  tax: number;
  /** All balances minus `tax` */
  value: number;
}

export interface YearRow {
  age: number;
  t: number;
  deflator: number;
  /** Deflator for end-of-year balances (= start of age + 1) */
  endDeflator: number;
  schoolCost: number;
  advanceBalance: number;
  contribResp: number;
  contribParentTfsa: number;
  contribParentNonReg: number;
  transferToResp: number;
  cesg: number;
  qesi: number;
  eap: number;
  pseWithdrawal: number;
  taxChild: number;
  taxParent: number;
  aipTax: number;
  grantsRepaid: number;
  resp: number;
  parentTfsa: number;
  parentNonReg: number;
  childTfsa: number;
  childNonReg: number;
  total: number;
  transfers: Transfer[];
  ledger: Record<AccountKey, LedgerEntry>;
  childEmploymentIncome: number;
  childDistributions: number;
  childTaxableGains: number;
  childTaxableIncome: number;
  childSaleProceeds: number;
  childRealizedGains: number;
  childTaxFederal: number;
  childTaxQuebec: number;
  childTaxWithoutProject: number;
  childTfsaNewRoom: number;
  parentDistributions: number;
  parentRealizedGains: number;
  parentSaleProceeds: number;
  parentGainRate: number;
  parentGainTax: number;
  parentDistTax: number;
  aipAmount: number;
  aipRate: number;
  advanceOpen: number;
  grantEligible: number;
  cesgCumul: number;
  qesiCumul: number;
  respLifetimeContrib: number;
  eapPool: number;
  pseYearsLeft: number;
  respContribBalance: number;
  respGrantsTotal: number;
  grantRoomLeft: number;
  parentNonRegAcb: number;
  childNonRegAcb: number;
  childTfsaRoomLeft: number;
  /** Selling everything at the start of the next age (end of this row) */
  endLiquidation: Liquidation;
}

export interface Result {
  rows: YearRow[];
  /** Transfers at the annuity age (liquidation and purchase). */
  finalTransfers: Transfer[];
  capitalAtAnnuityNominal: number;
  capitalAtAnnuityReal: number;
  liquidationTaxReal: number;
  annuityNominal: number;
  annuityReal: number;
  /** After-tax savings at HOME_AGE if used as a down payment instead (0 if out of range). */
  homeDownPaymentReal: number;
  totalSchoolCostReal: number;
  pvSchoolCost: number;
  totalGrants: number;
  totalTaxReal: number;
  unrepaidAdvanceReal: number;
  deflatorAtAnnuity: number;
  finalLiquidation: Liquidation;
  nominalReturn: number;
  realReturn: number;
  annuityPayoutRate: number;
}
