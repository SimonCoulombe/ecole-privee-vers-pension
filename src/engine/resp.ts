import { PARAMS_2026, type Params } from "./params2026";

export interface GrantState {
  /** Unused grant-eligible contribution room (nominal $), before this year's accrual. */
  room: number;
  cesgReceived: number;
  qesiReceived: number;
  /** Contributions made before the end of the year the child turned 15. */
  contributedBy15: number;
  yearsWith100By15: number;
}

/** Assumes no RESP contributions before `startAge`: all room accrued since birth is available. */
export function initialGrantState(startAge: number, p: Params = PARAMS_2026): GrantState {
  const r = p.resp;
  // Room accrues from the birth year; the start year's accrual is added in grantsForYear.
  const room = r.grantAnnualRoom * Math.max(0, Math.min(startAge, r.grantLastAge + 1));
  return { room, cesgReceived: 0, qesiReceived: 0, contributedBy15: 0, yearsWith100By15: 0 };
}

/** Grant-eligible contribution still worth making this year (0 when caps are reached). */
export function usefulGrantContribution(state: GrantState, age: number, p: Params = PARAMS_2026): number {
  const r = p.resp;
  if (age > r.grantLastAge || !eligibleAt1617(state, age, p)) return 0;
  const room = state.room + r.grantAnnualRoom;
  const cesgLeft = (r.cesgLifetimeMax - state.cesgReceived) / r.cesgRate;
  const qesiLeft = (r.qesiLifetimeMax - state.qesiReceived) / r.qesiRate;
  return Math.max(0, Math.min(room, r.grantMaxEligiblePerYear, Math.max(cesgLeft, qesiLeft)));
}

function eligibleAt1617(state: GrantState, age: number, p: Params): boolean {
  const r = p.resp;
  if (age < 16) return true;
  return state.contributedBy15 >= r.age1617MinContribution || state.yearsWith100By15 >= r.age1617MinYears;
}

/** Applies one calendar year of contributions; returns the grants paid and mutates `state`. */
export function grantsForYear(
  state: GrantState,
  age: number,
  contribution: number,
  p: Params = PARAMS_2026,
): { cesg: number; qesi: number; eligible: number } {
  const r = p.resp;
  if (age > r.grantLastAge) return { cesg: 0, qesi: 0, eligible: 0 };
  state.room += r.grantAnnualRoom;
  let cesg = 0;
  let qesi = 0;
  let eligible = 0;
  if (eligibleAt1617(state, age, p)) {
    eligible = Math.min(contribution, state.room, r.grantMaxEligiblePerYear);
    cesg = Math.min(eligible * r.cesgRate, r.cesgLifetimeMax - state.cesgReceived);
    qesi = Math.min(eligible * r.qesiRate, r.qesiLifetimeMax - state.qesiReceived);
    state.room -= eligible;
    state.cesgReceived += cesg;
    state.qesiReceived += qesi;
  }
  if (age <= 15) {
    state.contributedBy15 += contribution;
    if (contribution >= r.age1617MinYearlyAmount) state.yearsWith100By15 += 1;
  }
  return { cesg, qesi, eligible };
}
