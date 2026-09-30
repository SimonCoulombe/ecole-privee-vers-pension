import type { Inputs } from "../engine/types";

export type FieldKind = "money" | "percent" | "age" | "years" | "number";

export interface FieldDef {
  key: keyof Inputs;
  label: string;
  kind: FieldKind;
  min: number;
  max: number;
  step: number;
  help?: string;
}

export interface Section {
  title: string;
  fields: FieldDef[];
  toggles?: { key: keyof Inputs; label: string; help?: string }[];
}

export const SECTIONS: Section[] = [
  {
    title: "École privée",
    fields: [
      { key: "schoolCostPerYear", label: "Coût annuel de l'école privée", kind: "money", min: 0, max: 100_000, step: 500, help: "En dollars constants (indexé à l'inflation)." },
      { key: "schoolStartAge", label: "Âge au début du secondaire", kind: "age", min: 5, max: 17, step: 1 },
      { key: "schoolYears", label: "Nombre d'années", kind: "years", min: 1, max: 12, step: 1 },
    ],
  },
  {
    title: "Stratégie de cotisation",
    fields: [
      { key: "respStartAge", label: "Âge de la première cotisation REEE", kind: "age", min: 0, max: 17, step: 1, help: "Commencer à cotiser au REEE plus tôt permet de mettre plus de 25 000 $ de frais de scolarité dans le REEE admissibles aux subventions." },
      { key: "respPerYear", label: "Montant au REEE par année", kind: "money", min: 0, max: 100_000, step: 500, help: "Versé chaque année, de l'âge de la première cotisation jusqu'à la fin du secondaire. Il a priorité : le CELI du parent est réduit au besoin. Seuls 2 500 $ (5 000 $ avec rattrapage) par année donnent droit aux subventions." },
      { key: "parentTfsaPerSchoolYear", label: "Montant au CELI du parent par année scolaire", kind: "money", min: 0, max: 100_000, step: 500, help: "Au maximum la part hors REEE. Le reste va au non enregistré du parent." },
    ],
    toggles: [
      { key: "topUpRespFromParent", label: "À 17 ans, transférer du CELI ou du non enregistré du parent vers le REEE afin d'aller chercher une 6e année de subvention si nécessaire" },
    ],
  },
  {
    title: "Parents",
    fields: [
      { key: "parentMarginalRate", label: "Taux marginal du parent (pendant le secondaire)", kind: "percent", min: 0, max: 0.54, step: 0.005, help: "Québec 2026 : 36,12 % (58-109 k$), 41,12 % (109-117 k$), 45,71 % (117-132 k$), 47,46 % (132-181 k$), 49,97 %, 53,31 %." },
      { key: "parentMarginalRateAtTransfer", label: "Taux marginal du parent au transfert (18 ans)", kind: "percent", min: 0, max: 0.54, step: 0.005 },
    ],
    toggles: [
      { key: "emptyParentTfsaAt18", label: "Vider le CELI du parent à 18 ans", help: "Moins avantageux fiscalement : ce qui ne rentre pas dans le CELI de l'enfant va dans son non enregistré. Mais le parent récupère ses droits CELI dès l'année suivante." },
    ],
  },
  {
    title: "Enfant",
    fields: [
      { key: "pseStartAge", label: "Âge au début du cégep", kind: "age", min: 15, max: 25, step: 1 },
      { key: "pseYears", label: "Années d'études postsecondaires", kind: "years", min: 1, max: 10, step: 1, help: "Ex. : 2 ans de cégep + 3 ans d'université." },
      { key: "studentJobIncome", label: "Revenu d'emploi pendant les études", kind: "money", min: 0, max: 100_000, step: 500 },
      { key: "workIncomeAfterStudies", label: "Revenu d'emploi après les études", kind: "money", min: 0, max: 500_000, step: 1_000, help: "Sert à calculer l'impôt sur les placements non enregistrés de l'enfant, y compris la vente à l'achat de la rente." },
    ],
    toggles: [
      { key: "pseEnabled", label: "L'enfant fait des études postsecondaires", help: "Sinon : subventions remboursées, revenus du REEE imposés au taux du parent + 20 %." },
    ],
  },
  {
    title: "Marchés",
    fields: [
      { key: "realReturn", label: "Rendement réel (au-dessus de l'inflation), après les frais", kind: "percent", min: -0.02, max: 0.12, step: 0.005, help: "Ex. : VEQT a des frais d'environ 0,24 %. Les hypothèses de projection de l'IQPF donnent plutôt environ 4-5 % réel pour des actions." },
      { key: "inflation", label: "Inflation", kind: "percent", min: 0, max: 0.1, step: 0.001 },
      { key: "distributionYield", label: "Rendement en distributions", kind: "percent", min: 0, max: 0.1, step: 0.001, help: "Imposé chaque année dans un compte non enregistré (traité comme revenu ordinaire)." },
    ],
  },
  {
    title: "Rente",
    fields: [
      { key: "annuityPayoutRate", label: "Taux de rente (paiement annuel / prime)", kind: "percent", min: 0.02, max: 0.15, step: 0.001, help: "Ex. : 66 000 $ par an pour 1 000 000 $ = 6,6 % (homme de 65 ans, rente viagère non indexée)." },
    ],
  },
];

export const ALL_FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields);
export const ALL_TOGGLES = SECTIONS.flatMap((s) => s.toggles ?? []);
