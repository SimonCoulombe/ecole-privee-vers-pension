import { maxRespPerYear, outsideRespPerSchoolYear } from "../engine/plan";
import type { Inputs } from "../engine/types";

const clamp = (v: number, max: number) => Math.min(Math.max(0, v), max);

const RESP_PRIORITY_KEYS = new Set<keyof Inputs>(["respPerYear", "schoolCostPerYear", "schoolYears", "schoolStartAge", "respStartAge"]);

/** RESP total + parent TFSA total <= total school cost; the RESP has priority, non-registered takes the rest. */
export function normalizeAllocation(inp: Inputs): Inputs {
  const withResp = { ...inp, respPerYear: clamp(inp.respPerYear, maxRespPerYear(inp)) };
  return { ...withResp, parentTfsaPerSchoolYear: clamp(inp.parentTfsaPerSchoolYear, outsideRespPerSchoolYear(withResp)) };
}

export function applyChange(inputs: Inputs, key: keyof Inputs, value: number | boolean | null): Inputs {
  const next = { ...inputs, [key]: value } as Inputs;
  if (key === "parentTfsaPerSchoolYear") {
    next.parentTfsaPerSchoolYear = clamp(next.parentTfsaPerSchoolYear, outsideRespPerSchoolYear(inputs));
  } else if (RESP_PRIORITY_KEYS.has(key)) {
    return normalizeAllocation(next);
  }
  return next;
}
