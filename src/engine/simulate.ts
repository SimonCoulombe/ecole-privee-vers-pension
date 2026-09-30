import { ANNUITY_AGE, HOME_AGE } from "./defaults";
import { PARAMS_2026, type Params } from "./params2026";
import { earlyRespYears } from "./plan";
import { grantsForYear, initialGrantState, usefulGrantContribution } from "./resp";
import { taxBreakdown } from "./tax";
import { ACCOUNTS, type AccountKey, type Inputs, type Liquidation, type Place, type Result, type Transfer, type YearRow } from "./types";

interface NonReg {
  value: number;
  acb: number;
}

function buy(acc: NonReg, cash: number): void {
  acc.value += cash;
  acc.acb += cash;
}

/** Sells `amount` (capped at the account value) and returns the realized capital gain. */
function sell(acc: NonReg, amount: number): { cash: number; gain: number } {
  const cash = Math.min(amount, acc.value);
  if (cash <= 0) return { cash: 0, gain: 0 };
  const acbSold = acc.acb * (cash / acc.value);
  acc.value -= cash;
  acc.acb -= acbSold;
  return { cash, gain: cash - acbSold };
}

export function nominalReturn(inp: Inputs): number {
  return (1 + inp.realReturn) * (1 + inp.inflation) - 1;
}

export function simulate(inp: Inputs, p: Params = PARAMS_2026): Result {
  const r = p.resp;
  const incl = p.capitalGainsInclusion;
  const R = nominalReturn(inp);
  const y = inp.distributionYield;
  // Without RESP contributions an earlier start age changes nothing, so start at high school
  const t0Age = inp.respPerYear > 0 ? Math.min(inp.respStartAge, inp.schoolStartAge) : inp.schoolStartAge;
  const schoolEnd = inp.schoolStartAge + inp.schoolYears - 1;
  const respPerYear = inp.respPerYear;
  // Early RESP contributions are taken back evenly from the school-year budgets
  const recoverPerSchoolYear = inp.schoolYears > 0 ? (respPerYear * earlyRespYears(inp)) / inp.schoolYears : 0;
  const pseEnd = inp.pseStartAge + inp.pseYears - 1;
  const transferAge = Math.max(p.tfsaMinAge, schoolEnd + 1, r.grantLastAge + 1);
  const deflatorAt = (age: number) => Math.pow(1 + inp.inflation, age - t0Age);

  const grantState = initialGrantState(t0Age, p);
  const resp = { value: 0, contrib: 0, grants: 0, lifetimeContrib: 0 };
  const parentNonReg: NonReg = { value: 0, acb: 0 };
  const childNonReg: NonReg = { value: 0, acb: 0 };
  let parentTfsa = 0;
  let childTfsa = 0;
  let childTfsaRoom = 0;
  let advance = 0;

  let pvSchoolCost = 0;
  let totalSchoolCostReal = 0;
  let totalGrants = 0;
  let totalTaxReal = 0;
  let unrepaidAdvanceReal = 0;
  let homeDownPaymentReal = 0;
  const rows: YearRow[] = [];

  /** Everything cashed out at the start of `age` (gains taxed over work income). */
  const liquidate = (age: number): Liquidation => {
    const D = deflatorAt(age);
    const unrealizedGains =
      Math.max(0, childNonReg.value - childNonReg.acb) + Math.max(0, parentNonReg.value - parentNonReg.acb);
    const baseIncome = inp.workIncomeAfterStudies * D;
    const t = taxBreakdown(baseIncome, unrealizedGains * incl, D, p);
    const gross = childTfsa + parentTfsa + childNonReg.value + parentNonReg.value + resp.value;
    return { baseIncome, unrealizedGains, taxableGains: unrealizedGains * incl, ...t, value: gross - t.tax };
  };

  for (let age = t0Age; age < ANNUITY_AGE; age++) {
    const t = age - t0Age;
    const D = deflatorAt(age);
    const row: YearRow = {
      age, t, deflator: D, endDeflator: deflatorAt(age + 1), schoolCost: 0, advanceBalance: 0,
      contribResp: 0, contribParentTfsa: 0, contribParentNonReg: 0, transferToResp: 0,
      cesg: 0, qesi: 0, eap: 0, pseWithdrawal: 0,
      taxChild: 0, taxParent: 0, aipTax: 0, grantsRepaid: 0,
      resp: 0, parentTfsa: 0, parentNonReg: 0, childTfsa: 0, childNonReg: 0, total: 0,
      transfers: [],
      ledger: {
        resp: { open: resp.value, in: 0, out: 0, growth: 0 },
        parentTfsa: { open: parentTfsa, in: 0, out: 0, growth: 0 },
        parentNonReg: { open: parentNonReg.value, in: 0, out: 0, growth: 0 },
        childTfsa: { open: childTfsa, in: 0, out: 0, growth: 0 },
        childNonReg: { open: childNonReg.value, in: 0, out: 0, growth: 0 },
      },
      childEmploymentIncome: 0, childDistributions: 0, childTaxableGains: 0, childTaxableIncome: 0,
      childSaleProceeds: 0, childRealizedGains: 0, childTaxFederal: 0, childTaxQuebec: 0, childTaxWithoutProject: 0,
      childTfsaNewRoom: 0,
      parentDistributions: 0, parentRealizedGains: 0, parentSaleProceeds: 0, parentGainRate: 0, parentGainTax: 0,
      parentDistTax: 0, aipAmount: 0, aipRate: 0,
      advanceOpen: advance, grantEligible: 0, cesgCumul: 0, qesiCumul: 0, respLifetimeContrib: 0, eapPool: 0, pseYearsLeft: 0,
      respContribBalance: 0, respGrantsTotal: 0, grantRoomLeft: 0,
      parentNonRegAcb: 0, childNonRegAcb: 0, childTfsaRoomLeft: 0,
      endLiquidation: { baseIncome: 0, unrealizedGains: 0, taxableGains: 0, federal: 0, quebec: 0, withoutProject: 0, tax: 0, value: 0 },
    };
    const isAccount = (x: Place): x is AccountKey => (ACCOUNTS as readonly string[]).includes(x);
    const log = (from: Place, to: Place, amount: number, note: string) => {
      if (amount <= 0) return;
      if (isAccount(from)) row.ledger[from].out += amount;
      if (isAccount(to)) row.ledger[to].in += amount;
      if (amount >= 0.5) row.transfers.push({ from, to, amount, deflator: D, note });
    };

    if (age >= p.tfsaMinAge) {
      row.childTfsaNewRoom = p.tfsaAnnualLimit * D;
      childTfsaRoom += row.childTfsaNewRoom;
    }

    // --- Parent contributions ---
    const respRoomLeft = () => Math.max(0, r.lifetimeContributionLimit - resp.lifetimeContrib - row.contribResp);
    const isSchoolYear = age >= inp.schoolStartAge && age <= schoolEnd;
    if (age >= inp.respStartAge && age < inp.schoolStartAge) {
      const early = Math.min(respPerYear * D, respRoomLeft());
      advance += early;
      row.contribResp += early;
      log("avance", "resp", early, "Cotisation avant le secondaire (déduite du budget de l'école plus tard)");
    }
    if (isSchoolYear) {
      let budget = inp.schoolCostPerYear * D;
      row.schoolCost = budget;
      pvSchoolCost += budget / Math.pow(1 + R, t);
      totalSchoolCostReal += budget / D;

      const toResp = age >= inp.respStartAge ? Math.min(respPerYear * D, budget, respRoomLeft()) : 0;
      row.contribResp += toResp;
      budget -= toResp;
      log("budget", "resp", toResp, "Cotisation");

      const repay = Math.min(budget, advance, recoverPerSchoolYear * D);
      advance -= repay;
      budget -= repay;
      log("budget", "avance", repay, "Part du budget déjà versée au REEE avant le secondaire");

      const toTfsa = Math.min(inp.parentTfsaPerSchoolYear * D, budget);
      parentTfsa += toTfsa;
      row.contribParentTfsa = toTfsa;
      budget -= toTfsa;
      log("budget", "parentTfsa", toTfsa, "Cotisation");

      buy(parentNonReg, budget);
      row.contribParentNonReg = budget;
      log("budget", "parentNonReg", budget, "Placement du reste du budget");
    }

    // Last grant year: move parent money (TFSA first, then non-reg) into the RESP to collect any grants still available
    if (inp.topUpRespFromParent && age === r.grantLastAge) {
      let need = Math.max(0, Math.min(usefulGrantContribution(grantState, age, p) - row.contribResp, respRoomLeft()));
      const fromTfsa = Math.min(need, parentTfsa);
      parentTfsa -= fromTfsa;
      need -= fromTfsa;
      log("parentTfsa", "resp", fromTfsa, "Transfert à 17 ans pour aller chercher les subventions restantes");
      // Sell enough to deposit `need` after paying the tax on the realized gain
      const gainShare = parentNonReg.value > 0 ? Math.max(0, 1 - parentNonReg.acb / parentNonReg.value) : 0;
      const taxPerDollar = gainShare * incl * inp.parentMarginalRate;
      const sale = sell(parentNonReg, need / (1 - taxPerDollar));
      const tax = Math.max(0, sale.gain) * incl * inp.parentMarginalRate;
      if (sale.cash > 0) {
        row.taxParent += tax;
        row.parentGainTax += tax;
        row.parentGainRate = inp.parentMarginalRate;
        row.parentSaleProceeds += sale.cash;
        row.parentRealizedGains += sale.gain;
      }
      row.transferToResp = fromTfsa + sale.cash - tax;
      log("parentNonReg", "resp", sale.cash - tax, "Vente et transfert à 17 ans pour aller chercher les subventions restantes");
      log("parentNonReg", "impot", tax, "Impôt du parent sur le gain réalisé");
    }

    const respIn = row.contribResp + row.transferToResp;
    resp.value += respIn;
    resp.contrib += respIn;
    resp.lifetimeContrib += respIn;
    const g = grantsForYear(grantState, age, respIn, p);
    row.grantEligible = g.eligible;
    row.cesg = g.cesg;
    row.qesi = g.qesi;
    resp.value += g.cesg + g.qesi;
    resp.grants += g.cesg + g.qesi;
    totalGrants += g.cesg + g.qesi;
    log("gouv", "resp", g.cesg, "SCEE (20 %)");
    log("gouv", "resp", g.qesi, "IQEE (10 %)");

    if (age === schoolEnd) unrepaidAdvanceReal = advance / D;

    // --- Money reaching the child ---
    let childCash = 0;
    let childOrdinary = 0;
    let childGains = 0;

    if (age === transferAge && parentNonReg.value > 0) {
      const sale = sell(parentNonReg, parentNonReg.value);
      const tax = Math.max(0, sale.gain) * incl * inp.parentMarginalRateAtTransfer;
      row.taxParent += tax;
      row.parentGainTax += tax;
      row.parentGainRate = inp.parentMarginalRateAtTransfer;
      row.parentSaleProceeds += sale.cash;
      row.parentRealizedGains += sale.gain;
      childCash += sale.cash - tax;
      log("parentNonReg", "impot", tax, "Impôt du parent sur le gain à la vente");
      log("parentNonReg", "child", sale.cash - tax, "Don à l'enfant majeur");
    }

    if (inp.emptyParentTfsaAt18 && age === transferAge && parentTfsa > 0) {
      log("parentTfsa", "child", parentTfsa, "Retrait complet du CELI du parent, donné à l'enfant");
      childCash += parentTfsa;
      parentTfsa = 0;
    }

    const studying = inp.pseEnabled && age >= inp.pseStartAge && age <= pseEnd;

    if (!inp.pseEnabled && age === pseEnd && resp.value > 0) {
      const earnings = Math.max(0, resp.value - resp.contrib);
      const repaid = Math.min(resp.grants, earnings);
      const aip = earnings - repaid;
      const aipTax = aip * (inp.parentMarginalRateAtTransfer + r.aipAdditionalTax);
      row.grantsRepaid = repaid;
      row.aipTax = aipTax;
      row.aipAmount = aip;
      row.aipRate = inp.parentMarginalRateAtTransfer + r.aipAdditionalTax;
      totalGrants -= repaid;
      const returned = Math.min(resp.contrib, resp.value) + aip - aipTax;
      childCash += returned;
      log("resp", "gouv", repaid, "Subventions remboursées (pas d'études)");
      log("resp", "impot", aipTax, "Impôt sur le PRA (taux du parent + 20 %)");
      log("resp", "child", returned, "Fermeture du REEE : capital + PRA après impôt");
      resp.value = 0;
      resp.contrib = 0;
    }

    // --- Fill the child's TFSA: child non-reg (incl. gifts), EAP, RESP capital, then parent TFSA ---
    const room = () => (age >= p.tfsaMinAge ? childTfsaRoom : 0);
    const toChildTfsa = (amount: number) => {
      childTfsa += amount;
      childTfsaRoom -= amount;
    };
    /** Deposits `amount` leaving `from` into the child's TFSA, the rest into the child's non-reg. */
    const deposit = (from: Place, amount: number, note: string) => {
      const inTfsa = Math.min(amount, room());
      toChildTfsa(inTfsa);
      buy(childNonReg, amount - inTfsa);
      log(from, "childTfsa", inTfsa, note);
      log(from, "childNonReg", amount - inTfsa,
        `${note}, ${age < p.tfsaMinAge ? "moins de 18 ans, pas de CELI" : "droits CELI épuisés"}`);
    };

    deposit("child", childCash, "Dépôt");

    if (room() > 0 && childNonReg.value > 0) {
      const sale = sell(childNonReg, room());
      childGains += sale.gain;
      row.childSaleProceeds += sale.cash;
      toChildTfsa(sale.cash);
      log("childNonReg", "childTfsa", sale.cash, "Transfert vers les nouveaux droits CELI");
    }

    const lastStudyYear = studying && age === pseEnd;
    // No RESP withdrawals before the child has a TFSA, unless studies end sooner
    if (studying && (age >= p.tfsaMinAge || lastStudyYear)) {
      const yearsLeft = pseEnd - age + 1;
      const pool = Math.max(0, resp.value - resp.contrib);
      // At least an even share of what is left, more if TFSA room remains
      let eap = lastStudyYear ? pool : Math.min(pool, Math.max(room(), pool / yearsLeft));
      if (age === inp.pseStartAge && !lastStudyYear) eap = Math.min(eap, r.eapFirst13WeeksLimit);
      row.eapPool = pool;
      row.pseYearsLeft = yearsLeft;
      row.eap = eap;
      resp.value -= eap;
      childOrdinary += eap;
      deposit("resp", eap, "PAE (subventions + revenus, imposable pour l'enfant)");
    }

    if (studying && resp.contrib > 0 && (room() > 0 || lastStudyYear)) {
      const w = lastStudyYear ? Math.min(resp.contrib, resp.value) : Math.min(resp.contrib, resp.value, room());
      resp.value -= w;
      resp.contrib -= w;
      row.pseWithdrawal = w;
      deposit("resp", w, "Retrait du capital cotisé (non imposable)");
      if (lastStudyYear && resp.value > 0) {
        // Rounding residue left after the final EAP
        log("resp", "childNonReg", resp.value, "Solde résiduel du REEE");
        buy(childNonReg, resp.value);
        resp.value = 0;
      }
    }

    if (age >= transferAge && parentTfsa > 0) {
      const m = Math.min(parentTfsa, room());
      parentTfsa -= m;
      toChildTfsa(m);
      log("parentTfsa", "childTfsa", m, "Don vers le CELI de l'enfant (droits disponibles)");
    }

    // --- Taxes for the year (paid at the start, like every other flow), then growth ---
    const childDist = childNonReg.value * y;
    childOrdinary += childDist;
    const baseIncome = studying
      ? inp.studentJobIncome * D
      : age >= inp.pseStartAge
        ? inp.workIncomeAfterStudies * D
        : 0;
    const childTaxableGains = Math.max(0, childGains) * incl;
    const ct = taxBreakdown(baseIncome, childOrdinary + childTaxableGains, D, p);
    const childTax = ct.tax;
    row.taxChild = childTax;
    row.childTaxFederal = ct.federal;
    row.childTaxQuebec = ct.quebec;
    row.childTaxWithoutProject = ct.withoutProject;
    row.childEmploymentIncome = baseIncome;
    row.childDistributions = childDist;
    row.childRealizedGains = childGains;
    row.childTaxableGains = childTaxableGains;
    row.childTaxableIncome = baseIncome + childOrdinary + childTaxableGains;
    const fromNonReg = Math.min(childTax, childNonReg.value);
    childNonReg.value -= fromNonReg;
    childNonReg.acb = Math.max(0, childNonReg.acb + childDist - fromNonReg);
    const fromTfsa = Math.min(childTax - fromNonReg, childTfsa);
    childTfsa -= fromTfsa;
    log("childNonReg", "impot", fromNonReg, "Impôt de l'enfant (PAE, distributions, gains)");
    log("childTfsa", "impot", fromTfsa, "Impôt de l'enfant (PAE, distributions, gains)");

    const parentDist = parentNonReg.value * y;
    const parentDistTax = parentDist * inp.parentMarginalRate;
    row.taxParent += parentDistTax;
    row.parentDistTax = parentDistTax;
    row.parentDistributions = parentDist;
    log("parentNonReg", "impot", parentDistTax, "Impôt annuel du parent sur les distributions");
    parentNonReg.value -= parentDistTax;
    parentNonReg.acb += parentDist - parentDistTax;

    row.ledger.resp.growth = resp.value * R;
    row.ledger.parentTfsa.growth = parentTfsa * R;
    row.ledger.parentNonReg.growth = parentNonReg.value * R;
    row.ledger.childTfsa.growth = childTfsa * R;
    row.ledger.childNonReg.growth = childNonReg.value * R;
    resp.value *= 1 + R;
    parentTfsa *= 1 + R;
    parentNonReg.value *= 1 + R;
    childTfsa *= 1 + R;
    childNonReg.value *= 1 + R;
    // Early contributions are deducted from later school budgets in constant dollars (no interest)
    advance *= 1 + inp.inflation;

    totalTaxReal += (row.taxChild + row.taxParent + row.aipTax) / D;

    row.advanceBalance = advance;
    row.resp = resp.value;
    row.parentTfsa = parentTfsa;
    row.parentNonReg = parentNonReg.value;
    row.childTfsa = childTfsa;
    row.childNonReg = childNonReg.value;
    row.total = resp.value + parentTfsa + parentNonReg.value + childTfsa + childNonReg.value;
    row.respContribBalance = resp.contrib;
    row.respGrantsTotal = resp.grants;
    row.respLifetimeContrib = resp.lifetimeContrib;
    row.cesgCumul = grantState.cesgReceived;
    row.qesiCumul = grantState.qesiReceived;
    row.grantRoomLeft = age < r.grantLastAge ? grantState.room : 0;
    row.parentNonRegAcb = parentNonReg.acb;
    row.childNonRegAcb = childNonReg.acb;
    row.childTfsaRoomLeft = childTfsaRoom;
    row.endLiquidation = liquidate(age + 1);
    rows.push(row);

    if (age + 1 === HOME_AGE) homeDownPaymentReal = row.endLiquidation.value / row.endDeflator;
  }

  // --- Liquidation at annuity age ---
  const finalLiquidation = liquidate(ANNUITY_AGE);
  const { value: capital, tax: liquidationTax } = finalLiquidation;
  const D = deflatorAt(ANNUITY_AGE);
  totalTaxReal += liquidationTax / D;

  const annuityNominal = capital * inp.annuityPayoutRate;
  const finalTransfers: Transfer[] = [];
  if (liquidationTax >= 0.5) {
    finalTransfers.push({ from: "childNonReg", to: "impot", amount: liquidationTax, deflator: D, note: "Impôt sur le gain à la vente des placements non enregistrés" });
  }
  finalTransfers.push({ from: "comptes", to: "rente", amount: capital, deflator: D, note: "Achat de la rente viagère" });

  return {
    rows,
    finalTransfers,
    capitalAtAnnuityNominal: capital,
    capitalAtAnnuityReal: capital / D,
    liquidationTaxReal: liquidationTax / D,
    annuityNominal,
    annuityReal: annuityNominal / D,
    homeDownPaymentReal,
    totalSchoolCostReal,
    pvSchoolCost,
    totalGrants,
    totalTaxReal,
    unrepaidAdvanceReal,
    deflatorAtAnnuity: D,
    finalLiquidation,
    nominalReturn: R,
    realReturn: inp.realReturn,
    annuityPayoutRate: inp.annuityPayoutRate,
  };
}
