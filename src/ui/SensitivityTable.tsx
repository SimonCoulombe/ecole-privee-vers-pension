import type { SensitivityGrid } from "../engine/optimizer";
import { fmtMoney, fmtPct } from "./format";

export function SensitivityTable({ grid, currentReturn, currentPayout }: {
  grid: SensitivityGrid;
  currentReturn: number;
  currentPayout: number;
}) {
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  return (
    <div className="table-wrap">
      <table className="sensitivity">
        <caption>Rente annuelle (dollars constants) selon le rendement réel et le taux de rente</caption>
        <thead>
          <tr>
            <th scope="col">Rendement réel ↓ / Taux de rente →</th>
            {grid.payoutRates.map((p) => <th scope="col" key={p}>{fmtPct(p)}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.returns.map((r, i) => (
            <tr key={r}>
              <th scope="row">{fmtPct(r)}</th>
              {grid.payoutRates.map((p, j) => (
                <td key={p} className={close(r, currentReturn) && close(p, currentPayout) ? "current" : undefined}>
                  {fmtMoney(grid.annuityReal[i][j])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
