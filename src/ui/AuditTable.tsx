import { useState } from "react";
import { ANNUITY_AGE, HOME_AGE } from "../engine/defaults";
import { PARAMS_2026 } from "../engine/params2026";
import { ACCOUNTS, type AccountKey, type Place, type Result, type YearRow } from "../engine/types";
import { fmtMoney, fmtPct, inMode, modeLabel, type DollarMode } from "./format";

type Fmt = "money" | "index" | "pct" | "count";

interface Col {
  group: string;
  label: string;
  get?: (row: YearRow, mode: DollarMode, res: Result) => number;
  /** Value on the final line (annuity purchase); omitted = blank. */
  final?: (res: Result, mode: DollarMode) => number;
  fmt?: Fmt;
  /** Legal caps and running totals, never indexed: always shown in current dollars */
  nominal?: boolean;
}

const INCL = PARAMS_2026.capitalGainsInclusion;
const flow = (row: YearRow, v: number, mode: DollarMode) => inMode(v, row.deflator, mode);
const close = (row: YearRow, v: number, mode: DollarMode) => inMode(v, row.endDeflator, mode);
const isAccount = (p: Place) => (ACCOUNTS as readonly string[]).includes(p);
const sumT = (row: YearRow, match: (from: Place, to: Place) => boolean) =>
  row.transfers.filter((t) => match(t.from, t.to)).reduce((s, t) => s + t.amount, 0);
const between = (from: Place, to: Place) => (f: Place, t: Place) => f === from && t === to;

const lastRow = (r: Result) => r.rows[r.rows.length - 1];
const atAnnuity = (r: Result, v: number, mode: DollarMode) => inMode(v, r.deflatorAtAnnuity, mode);
const rateFor = (res: Result, mode: DollarMode) => (mode === "constant" ? res.realReturn : res.nominalReturn);

function ledgerCols(group: string, acc: AccountKey, extra: Omit<Col, "group">[] = []): Col[] {
  return [
    { group, label: "Début", get: (r, m) => flow(r, r.ledger[acc].open, m), final: (res, m) => atAnnuity(res, lastRow(res)[acc], m) },
    { group, label: "Entrées", get: (r, m) => flow(r, r.ledger[acc].in, m) },
    { group, label: "Sorties", get: (r, m) => flow(r, r.ledger[acc].out, m) },
    // Derived so the line always balances; equals (Début + Entrées − Sorties) × taux
    { group, label: "Rendement", get: (r, m) => close(r, r[acc], m) - flow(r, r.ledger[acc].open + r.ledger[acc].in - r.ledger[acc].out, m) },
    { group, label: "Fin", get: (r, m) => close(r, r[acc], m) },
    ...extra.map((c) => ({ ...c, group })),
  ];
}

const G_YEAR = "Année";
const G_BUDGET = "Budget de l'école";
const G_ADV = "Cotisations anticipées";
const G_RESP = "REEE";
const G_PTAX = "Impôt du parent";
const G_CTAX = "Impôt de l'enfant";
const G_TOTAL = "Total des comptes";
const G_SELL = "Si tout était vendu en fin d'année";
const G_ANN = "Rente";

const advanceBase = (r: YearRow) =>
  r.advanceOpen + sumT(r, between("avance", "resp")) - sumT(r, between("budget", "avance"));
const apports = (r: YearRow) => sumT(r, (f, t) => (f === "budget" || f === "avance") && isAccount(t));
const taxPaid = (r: YearRow) => sumT(r, (f, t) => isAccount(f) && t === "impot");
const totalOpen = (r: YearRow) => ACCOUNTS.reduce((s, a) => s + r.ledger[a].open, 0);
const fin = (res: Result) => res.finalLiquidation;

const COLUMNS: Col[] = [
  { group: G_YEAR, label: "Indice d'inflation (début)", fmt: "index", get: (r) => r.deflator, final: (res) => res.deflatorAtAnnuity },
  { group: G_YEAR, label: "Indice d'inflation (fin)", fmt: "index", get: (r) => r.endDeflator },
  { group: G_YEAR, label: "Taux de rendement", fmt: "pct", get: (_r, m, res) => rateFor(res, m) },

  { group: G_BUDGET, label: "Frais d'école", get: (r, m) => flow(r, r.schoolCost, m) },
  { group: G_BUDGET, label: "→ REEE", get: (r, m) => flow(r, sumT(r, between("budget", "resp")), m) },
  { group: G_BUDGET, label: "→ Récupération cotisations anticipées", get: (r, m) => flow(r, sumT(r, between("budget", "avance")), m) },
  { group: G_BUDGET, label: "→ CELI du parent", get: (r, m) => flow(r, r.contribParentTfsa, m) },
  { group: G_BUDGET, label: "→ Non enr. du parent", get: (r, m) => flow(r, r.contribParentNonReg, m) },

  { group: G_ADV, label: "Début", get: (r, m) => flow(r, r.advanceOpen, m) },
  { group: G_ADV, label: "Versées au REEE", get: (r, m) => flow(r, sumT(r, between("avance", "resp")), m) },
  { group: G_ADV, label: "Récupérées sur le budget", get: (r, m) => flow(r, sumT(r, between("budget", "avance")), m) },
  { group: G_ADV, label: "Indexation (inflation)", get: (r, m) => close(r, r.advanceBalance, m) - flow(r, advanceBase(r), m) },
  { group: G_ADV, label: "Fin", get: (r, m) => close(r, r.advanceBalance, m) },

  { group: G_RESP, label: "Début", get: (r, m) => flow(r, r.ledger.resp.open, m), final: (res, m) => atAnnuity(res, lastRow(res).resp, m) },
  { group: G_RESP, label: "Cotisations", get: (r, m) => flow(r, r.contribResp + r.transferToResp, m) },
  { group: G_RESP, label: "SCEE", get: (r, m) => flow(r, r.cesg, m) },
  { group: G_RESP, label: "IQEE", get: (r, m) => flow(r, r.qesi, m) },
  { group: G_RESP, label: "PAE", get: (r, m) => flow(r, r.eap, m) },
  { group: G_RESP, label: "Retrait du capital", get: (r, m) => flow(r, r.pseWithdrawal, m) },
  { group: G_RESP, label: "Autres sorties", get: (r, m) => flow(r, r.ledger.resp.out - r.eap - r.pseWithdrawal, m) },
  { group: G_RESP, label: "Rendement", get: (r, m) => close(r, r.resp, m) - flow(r, r.ledger.resp.open + r.ledger.resp.in - r.ledger.resp.out, m) },
  { group: G_RESP, label: "Fin", get: (r, m) => close(r, r.resp, m) },
  { group: G_RESP, label: "Cotisation subventionnée", get: (r, m) => flow(r, r.grantEligible, m) },
  { group: G_RESP, label: "Revenus + subventions avant PAE", get: (r, m) => flow(r, r.eapPool, m) },
  { group: G_RESP, label: "Années d'études restantes", fmt: "count", get: (r) => r.pseYearsLeft },
  { group: G_RESP, label: "Capital cotisé restant", get: (r, m) => close(r, r.respContribBalance, m) },
  { group: G_RESP, label: "Cotisations cumulées (max 50 000 $)", nominal: true, get: (r) => r.respLifetimeContrib },
  { group: G_RESP, label: "SCEE cumulée (max 7 200 $)", nominal: true, get: (r) => r.cesgCumul },
  { group: G_RESP, label: "IQEE cumulée (max 3 600 $)", nominal: true, get: (r) => r.qesiCumul },
  { group: G_RESP, label: "Droits subventionnables restants", nominal: true, get: (r) => r.grantRoomLeft },

  ...ledgerCols("CELI du parent", "parentTfsa"),
  ...ledgerCols("Non enregistré du parent", "parentNonReg", [
    { label: "Produit des ventes", get: (r, m) => flow(r, r.parentSaleProceeds, m) },
    { label: "PBR des unités vendues", get: (r, m) => flow(r, r.parentSaleProceeds - r.parentRealizedGains, m) },
    { label: "Distributions (réinvesties)", get: (r, m) => flow(r, r.parentDistributions, m) },
    { label: "Prix de base rajusté (fin)", get: (r, m) => close(r, r.parentNonRegAcb, m) },
  ]),
  ...ledgerCols("CELI de l'enfant", "childTfsa", [
    { label: "Nouveaux droits", get: (r, m) => flow(r, r.childTfsaNewRoom, m) },
    { label: "Droits inutilisés (fin)", get: (r, m) => close(r, r.childTfsaRoomLeft, m) },
  ]),
  ...ledgerCols("Non enregistré de l'enfant", "childNonReg", [
    { label: "Produit des ventes", get: (r, m) => flow(r, r.childSaleProceeds, m) },
    { label: "PBR des unités vendues", get: (r, m) => flow(r, r.childSaleProceeds - r.childRealizedGains, m) },
    { label: "Distributions (réinvesties)", get: (r, m) => flow(r, r.childDistributions, m) },
    { label: "Prix de base rajusté (fin)", get: (r, m) => close(r, r.childNonRegAcb, m) },
  ]),

  { group: G_PTAX, label: "Gain réalisé", get: (r, m) => flow(r, r.parentRealizedGains, m) },
  { group: G_PTAX, label: "Gain imposable (50 %)", get: (r, m) => flow(r, Math.max(0, r.parentRealizedGains) * INCL, m) },
  { group: G_PTAX, label: "Taux marginal (gain)", fmt: "pct", get: (r) => r.parentGainRate },
  { group: G_PTAX, label: "Impôt sur le gain", get: (r, m) => flow(r, r.parentGainTax, m) },
  { group: G_PTAX, label: "Distributions", get: (r, m) => flow(r, r.parentDistributions, m) },
  { group: G_PTAX, label: "Taux marginal (distributions)", fmt: "pct", get: (r) => (r.parentDistributions > 0 ? r.parentDistTax / r.parentDistributions : 0) },
  { group: G_PTAX, label: "Impôt sur les distributions", get: (r, m) => flow(r, r.parentDistTax, m) },
  { group: G_PTAX, label: "PRA imposable", get: (r, m) => flow(r, r.aipAmount, m) },
  { group: G_PTAX, label: "Taux PRA (marginal + 20 %)", fmt: "pct", get: (r) => r.aipRate },
  { group: G_PTAX, label: "Impôt sur le PRA", get: (r, m) => flow(r, r.aipTax, m) },

  { group: G_CTAX, label: "Revenu d'emploi", get: (r, m) => flow(r, r.childEmploymentIncome, m), final: (res, m) => atAnnuity(res, fin(res).baseIncome, m) },
  { group: G_CTAX, label: "PAE", get: (r, m) => flow(r, r.eap, m) },
  { group: G_CTAX, label: "Distributions", get: (r, m) => flow(r, r.childDistributions, m) },
  { group: G_CTAX, label: "Gain réalisé", get: (r, m) => flow(r, r.childRealizedGains, m), final: (res, m) => atAnnuity(res, fin(res).unrealizedGains, m) },
  { group: G_CTAX, label: "Gain imposable (50 %)", get: (r, m) => flow(r, r.childTaxableGains, m), final: (res, m) => atAnnuity(res, fin(res).taxableGains, m) },
  { group: G_CTAX, label: "Revenu imposable", get: (r, m) => flow(r, r.childTaxableIncome, m), final: (res, m) => atAnnuity(res, fin(res).baseIncome + fin(res).taxableGains, m) },
  { group: G_CTAX, label: "Impôt fédéral (après abattement)", get: (r, m) => flow(r, r.childTaxFederal, m), final: (res, m) => atAnnuity(res, fin(res).federal, m) },
  { group: G_CTAX, label: "Impôt du Québec", get: (r, m) => flow(r, r.childTaxQuebec, m), final: (res, m) => atAnnuity(res, fin(res).quebec, m) },
  { group: G_CTAX, label: "Impôt sur l'emploi seul", get: (r, m) => flow(r, r.childTaxWithoutProject, m), final: (res, m) => atAnnuity(res, fin(res).withoutProject, m) },
  { group: G_CTAX, label: "Impôt attribuable au projet", get: (r, m) => flow(r, r.taxChild, m), final: (res, m) => atAnnuity(res, fin(res).tax, m) },

  { group: G_TOTAL, label: "Début", get: (r, m) => flow(r, totalOpen(r), m), final: (res, m) => atAnnuity(res, lastRow(res).total, m) },
  { group: G_TOTAL, label: "Apports du parent", get: (r, m) => flow(r, apports(r), m) },
  { group: G_TOTAL, label: "Subventions", get: (r, m) => flow(r, r.cesg + r.qesi, m) },
  { group: G_TOTAL, label: "Subventions remboursées", get: (r, m) => flow(r, r.grantsRepaid, m) },
  { group: G_TOTAL, label: "Impôt payé", get: (r, m) => flow(r, taxPaid(r), m), final: (res, m) => atAnnuity(res, fin(res).tax, m) },
  {
    group: G_TOTAL, label: "Rendement",
    get: (r, m) => close(r, r.total, m) - flow(r, totalOpen(r) + apports(r) + r.cesg + r.qesi - r.grantsRepaid - taxPaid(r), m),
  },
  { group: G_TOTAL, label: "Fin", get: (r, m) => close(r, r.total, m), final: (res, m) => atAnnuity(res, res.capitalAtAnnuityNominal, m) },

  { group: G_SELL, label: "Gain latent (non enr.)", get: (r, m) => close(r, r.endLiquidation.unrealizedGains, m) },
  { group: G_SELL, label: "Impôt à la vente", get: (r, m) => close(r, r.endLiquidation.tax, m) },
  { group: G_SELL, label: "Valeur nette", get: (r, m) => close(r, r.endLiquidation.value, m) },

  { group: G_ANN, label: "Taux de rente", fmt: "pct", final: (res) => res.annuityPayoutRate },
  { group: G_ANN, label: "Rente annuelle", final: (res, m) => atAnnuity(res, res.annuityNominal, m) },
  { group: G_ANN, label: "Rente mensuelle", final: (res, m) => atAnnuity(res, res.annuityNominal / 12, m) },
];

const fmtIndex = (v: number) => v.toLocaleString("fr-CA", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
function cellText(c: Col, v: number | undefined) {
  if (v === undefined) return "";
  switch (c.fmt) {
    case "index": return fmtIndex(v);
    case "pct": return Math.abs(v) < 1e-9 ? "–" : fmtPct(v);
    case "count": return v > 0 ? String(v) : "–";
    default: return Math.abs(v) < 0.5 ? "–" : fmtMoney(v);
  }
}
const headerLabel = (c: Col, mode: DollarMode) => (c.nominal && mode === "constant" ? `${c.label} ($ courants)` : c.label);
const rowValue = (c: Col, row: YearRow, mode: DollarMode, res: Result) => c.get?.(row, mode, res);
const csvValue = (c: Col, v: number | undefined) =>
  v === undefined ? "" : c.fmt === "index" || c.fmt === "pct" ? v.toFixed(4) : c.fmt === "count" ? v : Math.round(v);

function groupsOf(cols: Col[]) {
  const groups: { name: string; span: number }[] = [];
  for (const c of cols) {
    const last = groups[groups.length - 1];
    if (last && last.name === c.group) last.span++;
    else groups.push({ name: c.group, span: 1 });
  }
  return groups;
}

function downloadCsv(result: Result, mode: DollarMode) {
  const header = ["Âge", ...COLUMNS.map((c) => `${c.group} - ${headerLabel(c, mode)}`)].join(";");
  const lines = result.rows.map((row) =>
    [row.age, ...COLUMNS.map((c) => csvValue(c, rowValue(c, row, mode, result)))].join(";"),
  );
  const final = [ANNUITY_AGE, ...COLUMNS.map((c) => csvValue(c, c.final?.(result, mode)))].join(";");
  const blob = new Blob(["\uFEFF" + [header, ...lines, final].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ecole-privee-vers-rente-${mode === "constant" ? "dollars-constants" : "dollars-courants"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const BALANCES: { key: AccountKey | "total"; label: string }[] = [
  { key: "resp", label: "REEE" },
  { key: "parentTfsa", label: "CELI du parent" },
  { key: "parentNonReg", label: "Non enr. du parent" },
  { key: "childTfsa", label: "CELI de l'enfant" },
  { key: "childNonReg", label: "Non enr. de l'enfant" },
  { key: "total", label: "Total" },
];

function BalancesTable({ result, mode }: { result: Result; mode: DollarMode }) {
  return (
    <div className="table-wrap balances-table">
      <table>
        <caption>Soldes à chaque anniversaire de l'enfant ({modeLabel(mode)}), les mêmes chiffres que le graphique.</caption>
        <thead>
          <tr>
            <th scope="col">Âge</th>
            {BALANCES.map((b) => <th scope="col" key={b.key}>{b.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.age}>
              <th scope="row">{row.age + 1}</th>
              {BALANCES.map((b) => <td key={b.key}>{fmtMoney(close(row, row[b.key], mode))}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FullAuditTable({ result, mode }: { result: Result; mode: DollarMode }) {
  const groups = groupsOf(COLUMNS);
  return (
    <>
      <div className="audit-head">
        <div>
          <p>
            Une ligne par année d'âge de l'enfant ({modeLabel(mode)}). Tous les mouvements de l'année ont lieu en début
            d'année, puis le rendement s'applique au solde restant. Pour chaque compte : Début + Entrées − Sorties +
            Rendement = Fin, et Rendement = (Début + Entrées − Sorties) × taux de rendement.
          </p>
          <p>
            En dollars constants, les montants d'une ligne sont divisés par l'indice de début d'année, sauf les soldes
            de fin (indice de fin d'année, qui est l'indice de début de l'année suivante), et le taux est le rendement
            réel. L'impôt est calculé avec les paliers 2026 indexés : en dollars constants, on peut le refaire
            directement avec les paliers 2026. Les plafonds légaux ne sont pas indexés, donc leurs colonnes sont
            toujours en dollars courants.
          </p>
          <p>
            « Si tout était vendu » : valeur après impôt si l'enfant vendait tout au début de l'année suivante; la ligne
            {" "}{HOME_AGE - 1} ans donne la mise de fonds à {HOME_AGE} ans. La dernière ligne ({ANNUITY_AGE} ans) montre la
            vente des placements et l'achat de la rente. Le détail de chaque entrée et sortie est dans le journal des
            transferts.
          </p>
        </div>
        <button type="button" onClick={() => downloadCsv(result, mode)}>Exporter en CSV</button>
      </div>
      <div className="table-wrap audit-table">
        <table>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className="sticky-col">Âge</th>
              {groups.map((g) => <th scope="colgroup" colSpan={g.span} key={g.name} className="group">{g.name}</th>)}
            </tr>
            <tr>
              {COLUMNS.map((c) => <th scope="col" key={`${c.group}-${c.label}`}>{headerLabel(c, mode)}</th>)}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.age} className={row.age === HOME_AGE - 1 ? "milestone" : undefined}>
                <th scope="row" className="sticky-col">{row.age}</th>
                {COLUMNS.map((c) => <td key={`${c.group}-${c.label}`}>{cellText(c, rowValue(c, row, mode, result))}</td>)}
              </tr>
            ))}
            <tr className="final">
              <th scope="row" className="sticky-col">{ANNUITY_AGE}</th>
              {COLUMNS.map((c) => <td key={`${c.group}-${c.label}`}>{cellText(c, c.final?.(result, mode))}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

type Tab = "soldes" | "audit";

export function AuditTable({ result, mode }: { result: Result; mode: DollarMode }) {
  const [tab, setTab] = useState<Tab>("soldes");
  return (
    <div className="audit">
      <div className="tabs" role="tablist" aria-label="Tableau">
        {([["soldes", "Soldes"], ["audit", "Audit complet"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "soldes" ? <BalancesTable result={result} mode={mode} /> : <FullAuditTable result={result} mode={mode} />}
      </div>
    </div>
  );
}
