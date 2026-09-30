// Tax-year 2026 parameters. Amounts in dollars of 2026.
// Sources:
// - Federal brackets, BPA, TFSA limit: canada.ca "Indexation adjustment for personal income tax and benefit amounts" (2026 column)
// - Quebec brackets: revenuquebec.ca "Income tax rates" (2026)
// - Quebec BPA 2026: 2025 amount ($18,571) indexed by 2.05 % (to confirm on revenuquebec.ca, line 350)
// - CESG / QESI / RESP / EAP rules: canada.ca (Canada Education Savings Grant) and revenuquebec.ca (IQEE)

export interface Bracket {
  upTo: number; // Infinity for the top bracket
  rate: number;
}

export const PARAMS_2026 = {
  year: 2026,
  federal: {
    brackets: [
      { upTo: 58_523, rate: 0.14 },
      { upTo: 117_045, rate: 0.205 },
      { upTo: 181_440, rate: 0.26 },
      { upTo: 258_482, rate: 0.29 },
      { upTo: Infinity, rate: 0.33 },
    ] as Bracket[],
    bpaMax: 16_452,
    bpaMin: 14_829,
    // BPA phases down from the start of the 29 % bracket to the start of the 33 % bracket
    bpaPhaseStart: 181_440,
    bpaPhaseEnd: 258_482,
    creditRate: 0.14,
    quebecAbatement: 0.165,
  },
  quebec: {
    brackets: [
      { upTo: 54_345, rate: 0.14 },
      { upTo: 108_680, rate: 0.19 },
      { upTo: 132_245, rate: 0.24 },
      { upTo: Infinity, rate: 0.2575 },
    ] as Bracket[],
    bpa: 18_952,
    creditRate: 0.14,
  },
  capitalGainsInclusion: 0.5,
  tfsaAnnualLimit: 7_000,
  tfsaMinAge: 18,
  resp: {
    lifetimeContributionLimit: 50_000, // nominal, not indexed
    grantAnnualRoom: 2_500, // grant-eligible contribution room accrued each year from birth
    grantMaxEligiblePerYear: 5_000, // current year + one year of catch-up
    grantLastAge: 17,
    cesgRate: 0.2,
    cesgLifetimeMax: 7_200,
    qesiRate: 0.1,
    qesiLifetimeMax: 3_600,
    // Age 16-17 rule: >= $2,000 contributed before end of year child turns 15, or >= $100/yr in 4 years
    age1617MinContribution: 2_000,
    age1617MinYears: 4,
    age1617MinYearlyAmount: 100,
    eapFirst13WeeksLimit: 8_000,
    aipAdditionalTax: 0.2, // 12 % federal + 8 % Quebec for Quebec residents
  },
} as const;

export type Params = typeof PARAMS_2026;
