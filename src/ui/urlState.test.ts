import { describe, expect, it } from "vitest";
import { simulate } from "../engine/simulate";
import { inputsFromUrl } from "./urlState";

describe("urlState", () => {
  it("opens with the home age at 30 and a down payment to show", () => {
    const inputs = inputsFromUrl("");
    expect(simulate(inputs).homeDownPaymentReal).toBeGreaterThan(0);
  });

  it("ignores parameters that no longer exist", () => {
    expect(inputsFromUrl("?fee=0.01&annuityIndexation=0.05&homeAge=40&annuityAge=70")).toEqual(inputsFromUrl(""));
  });
});
