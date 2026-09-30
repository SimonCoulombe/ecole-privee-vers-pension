import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Result, YearRow } from "../engine/types";
import { fmtMoney, inMode, type DollarMode } from "./format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const SERIES: { key: keyof YearRow; label: string; color: string }[] = [
  { key: "resp", label: "REEE", color: "#2563eb" },
  { key: "parentTfsa", label: "CELI du parent", color: "#16a34a" },
  { key: "parentNonReg", label: "Non enregistré du parent", color: "#ca8a04" },
  { key: "childTfsa", label: "CELI de l'enfant", color: "#9333ea" },
  { key: "childNonReg", label: "Non enregistré de l'enfant", color: "#dc2626" },
];

export function BalanceChart({ result, mode }: { result: Result; mode: DollarMode }) {
  const rows = result.rows;
  const data = {
    // Starting birthday, before the first contribution
    labels: [String(rows[0].age), ...rows.map((r) => String(r.age + 1))],
    datasets: SERIES.map((s) => ({
      label: s.label,
      data: [0, ...rows.map((r) => inMode(r[s.key] as number, r.endDeflator, mode))],
      borderColor: s.color,
      backgroundColor: `${s.color}66`,
      fill: true,
      pointRadius: 0,
      borderWidth: 1,
    })),
  };
  return (
    <div className="chart">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { title: { display: true, text: "Âge de l'enfant" } },
            y: { stacked: true, ticks: { callback: (v) => fmtMoney(Number(v)) } },
          },
          plugins: {
            tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${fmtMoney(Number(c.raw))}` } },
          },
        }}
      />
    </div>
  );
}
