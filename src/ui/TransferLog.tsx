import { ANNUITY_AGE } from "../engine/defaults";
import type { Place, Result, Transfer } from "../engine/types";
import { fmtMoney, inMode, modeLabel, type DollarMode } from "./format";

const PLACE: Record<Place, string> = {
  budget: "Budget de l'école",
  avance: "Cotisations anticipées",
  gouv: "Gouvernement",
  resp: "REEE",
  parentTfsa: "CELI du parent",
  parentNonReg: "Non enr. du parent",
  child: "Enfant (liquidités)",
  childTfsa: "CELI de l'enfant",
  childNonReg: "Non enr. de l'enfant",
  impot: "Impôt",
  comptes: "Tous les comptes",
  rente: "Rente",
};

export function TransferLog({ result, mode }: { result: Result; mode: DollarMode }) {
  const groups: { age: number; transfers: Transfer[] }[] = [
    ...result.rows.map((r) => ({ age: r.age, transfers: r.transfers })),
    { age: ANNUITY_AGE, transfers: result.finalTransfers },
  ].filter((g) => g.transfers.length > 0);

  return (
    <details className="transfer-log" open>
      <summary>Journal des transferts ({modeLabel(mode)})</summary>
      <div className="table-wrap">
        <table>
          <caption>Mouvements d'argent pendant l'année où l'enfant a l'âge indiqué. La croissance des placements n'est pas listée.</caption>
          <thead>
            <tr>
              <th scope="col">Âge</th>
              <th scope="col">De</th>
              <th scope="col">Vers</th>
              <th scope="col">Montant</th>
              <th scope="col">Détail</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.age}>
              {g.transfers.map((tr, i) => (
                <tr key={i} className={tr.to === "impot" ? "tax" : undefined}>
                  {i === 0 && <th scope="rowgroup" rowSpan={g.transfers.length}>{g.age}</th>}
                  <td>{PLACE[tr.from]}</td>
                  <td>{PLACE[tr.to]}</td>
                  <td className="amount">{fmtMoney(inMode(tr.amount, tr.deflator, mode))}</td>
                  <td className="note">{tr.note}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </details>
  );
}
