import type { DollarMode } from "./format";

export function DollarToggle({ mode, onChange }: { mode: DollarMode; onChange: (m: DollarMode) => void }) {
  return (
    <div className="dollar-toggle" role="radiogroup" aria-label="Type de dollars">
      {(["constant", "courant"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className={mode === m ? "active" : undefined}
          onClick={() => onChange(m)}
          title={m === "constant" ? "Pouvoir d'achat d'aujourd'hui (inflation retirée)" : "Montants réels de chaque année, inflation incluse"}
        >
          {m === "constant" ? "Dollars constants" : "Dollars courants"}
        </button>
      ))}
    </div>
  );
}
