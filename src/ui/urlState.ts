import { DEFAULT_INPUTS } from "../engine/defaults";
import type { Inputs } from "../engine/types";
import { normalizeAllocation } from "./allocation";
import { ALL_FIELDS, ALL_TOGGLES } from "./fields";

export function inputsFromUrl(search: string): Inputs {
  const q = new URLSearchParams(search);
  const out: Inputs = { ...DEFAULT_INPUTS };
  const writable = out as unknown as Record<string, number | boolean | null>;
  for (const f of ALL_FIELDS) {
    const raw = q.get(f.key);
    if (raw === null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) writable[f.key] = Math.min(f.max, Math.max(f.min, n));
  }
  for (const t of ALL_TOGGLES) {
    const raw = q.get(t.key);
    if (raw === "1" || raw === "0") writable[t.key] = raw === "1";
  }
  return normalizeAllocation(out);
}

export function inputsToUrl(inp: Inputs): string {
  const q = new URLSearchParams();
  const values = inp as unknown as Record<string, number | boolean | null>;
  const defaults = DEFAULT_INPUTS as unknown as Record<string, number | boolean | null>;
  for (const key of Object.keys(DEFAULT_INPUTS)) {
    const v = values[key];
    if (v === defaults[key] || v === null) continue;
    q.set(key, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
