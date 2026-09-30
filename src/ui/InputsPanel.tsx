import { useEffect, useState } from "react";
import { maxRespPerYear, outsideRespPerSchoolYear, parentNonRegPerSchoolYear, respTotal, respYears } from "../engine/plan";
import type { Inputs } from "../engine/types";
import { applyChange } from "./allocation";
import { SECTIONS, type FieldDef } from "./fields";
import { fmtMoney } from "./format";

interface Props {
  inputs: Inputs;
  onChange: (next: Inputs) => void;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

function NumberField({ def, value, onChange, max }: {
  def: FieldDef;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const upper = max ?? def.max;
  const scale = def.kind === "percent" ? 100 : 1;
  const toText = (v: number) => String(round(v * scale));
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    // Only resync on external changes, so partial input like "6." survives typing
    setText((cur) => {
      const parsed = Number(cur.replace(",", ".")) / scale;
      return cur.trim() !== "" && Math.abs(parsed - value) < 1e-9 ? cur : toText(value);
    });
  }, [value, scale]);

  const commit = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") return;
    const n = Number(raw.replace(",", ".")) / scale;
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(upper, Math.max(def.min, n));
    // Show the clamped value right away: if it equals the previous value, the sync effect won't fire
    if (clamped !== n) setText(toText(clamped));
    onChange(clamped);
  };

  const unit = def.kind === "money" ? "$" : def.kind === "percent" ? "%" : def.kind === "age" ? "ans" : def.kind === "years" ? "années" : "";
  const id = `f-${def.key}`;
  return (
    <div className="field">
      <label htmlFor={id}>{def.label}</label>
      <div className="input-unit">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={def.min * scale}
          max={upper * scale}
          step={round(def.step * scale)}
          value={text}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setText(toText(value))}
        />
        <span>{unit}</span>
      </div>
      {max !== undefined && <small>Maximum : {fmtMoney(max)}</small>}
      {def.help && <small>{def.help}</small>}
    </div>
  );
}

export function InputsPanel({ inputs, onChange }: Props) {
  const values = inputs as unknown as Record<string, number | boolean>;
  const set = (key: keyof Inputs, v: number | boolean) => onChange(applyChange(inputs, key, v));

  return (
    <div className="inputs">
      {SECTIONS.map((s) => (
        <details key={s.title} open={s.title !== "Marchés" && s.title !== "Parents"}>
          <summary>{s.title}</summary>
          {s.fields.map((f) => (
            <div key={f.key}>
              <NumberField
                def={f}
                value={values[f.key] as number}
                onChange={(v) => set(f.key, v)}
                max={f.key === "respPerYear" ? maxRespPerYear(inputs) : f.key === "parentTfsaPerSchoolYear" ? outsideRespPerSchoolYear(inputs) : undefined}
              />
              {f.key === "respPerYear" && (
                <>
                  <div className="field computed">
                    <span>Total au REEE ({respYears(inputs)} ans × {fmtMoney(inputs.respPerYear)})</span>
                    <output>{fmtMoney(respTotal(inputs))}</output>
                  </div>
                  <div className="field computed">
                    <span>Hors REEE, par année scolaire</span>
                    <output>{fmtMoney(outsideRespPerSchoolYear(inputs))}</output>
                  </div>
                </>
              )}
              {f.key === "parentTfsaPerSchoolYear" && (
                <div className="field computed">
                  <span>Non enregistré du parent (le reste)</span>
                  <output>{fmtMoney(parentNonRegPerSchoolYear(inputs))}</output>
                </div>
              )}
            </div>
          ))}
          {s.toggles?.map((t) => (
            <div className="field toggle" key={t.key}>
              <label>
                <input type="checkbox" checked={Boolean(values[t.key])} onChange={(e) => set(t.key, e.target.checked)} />
                {t.label}
              </label>
              {t.help && <small>{t.help}</small>}
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
