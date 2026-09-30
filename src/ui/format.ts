const money0 = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("fr-CA", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const fmtMoney = (v: number) => money0.format(Math.round(v));
export const fmtPct = (v: number) => pct.format(v);

export type DollarMode = "constant" | "courant";

/** Converts a nominal amount to the display mode, given the deflator for its date. */
export const inMode = (nominal: number, deflator: number, mode: DollarMode) =>
  mode === "constant" ? nominal / deflator : nominal;

export const modeLabel = (mode: DollarMode) => (mode === "constant" ? "dollars constants" : "dollars courants");
