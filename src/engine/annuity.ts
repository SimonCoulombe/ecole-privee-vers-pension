/** Purchasing power (today's $) of a level annuity payment `years` after purchase. */
export function realAnnuityPaymentAfter(firstPaymentReal: number, years: number, inflation: number): number {
  return firstPaymentReal / Math.pow(1 + inflation, years);
}
