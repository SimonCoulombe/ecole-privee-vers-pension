import { useEffect, useMemo, useState } from "react";
import { DEFAULT_INPUTS } from "./engine/defaults";
import { AuditTable } from "./ui/AuditTable";
import { optimize, sensitivity, type OptimizerResult } from "./engine/optimizer";
import { simulate } from "./engine/simulate";
import type { Inputs } from "./engine/types";
import { BalanceChart } from "./ui/BalanceChart";
import { DollarToggle } from "./ui/DollarToggle";
import { fmtMoney, type DollarMode } from "./ui/format";
import { Hypotheses } from "./ui/Hypotheses";
import { InputsPanel } from "./ui/InputsPanel";
import { SensitivityTable } from "./ui/SensitivityTable";
import { Summary } from "./ui/Summary";
import { TransferLog } from "./ui/TransferLog";
import { inputsFromUrl, inputsToUrl } from "./ui/urlState";

const withCurrent = (base: number[], current: number) =>
  [...new Set([...base, current].map((v) => Math.round(v * 10_000) / 10_000))].sort((a, b) => a - b);

export function App() {
  const [inputs, setInputs] = useState<Inputs>(() => inputsFromUrl(window.location.search));
  const [suggestion, setSuggestion] = useState<OptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [dollarMode, setDollarMode] = useState<DollarMode>("constant");

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${inputsToUrl(inputs)}`);
  }, [inputs]);

  const result = useMemo(() => simulate(inputs), [inputs]);
  const noPse = useMemo(() => simulate({ ...inputs, pseEnabled: false }), [inputs]);
  const grid = useMemo(
    () =>
      sensitivity(
        inputs,
        withCurrent([0.03, 0.04, 0.05, 0.06, 0.07], inputs.realReturn),
        withCurrent([0.055, 0.06, 0.066, 0.07, 0.075], inputs.annuityPayoutRate),
      ),
    [inputs],
  );
  const update = (next: Inputs) => {
    setInputs(next);
    setSuggestion(null);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app">
      <header>
        <h1>École privée ou rente à 65 ans?</h1>
        <p>
          Et si l'argent de l'école privée secondaire était plutôt investi (REEE, CELI, non enregistré) jusqu'à la
          retraite de votre enfant? Calculateur pour le Québec, règles fiscales 2026.
        </p>
      </header>

      <main>
        <aside>
          <div className="actions">
            <button type="button" className="primary" onClick={() => setSuggestion(optimize(inputs))}>
              Optimiser la répartition
            </button>
            <button type="button" onClick={() => update(DEFAULT_INPUTS)}>Réinitialiser</button>
            <button type="button" onClick={copyLink}>{copied ? "Lien copié!" : "Copier le lien"}</button>
          </div>

          {suggestion && (
            <div className="suggestion">
              <h3>Répartition suggérée</h3>
              <ul>
                <li>Première cotisation REEE à {suggestion.strategy.respStartAge} ans</li>
                <li>{fmtMoney(suggestion.strategy.respPerYear)} au REEE par année, de {suggestion.strategy.respStartAge} ans à la fin du secondaire</li>
                <li>{fmtMoney(suggestion.strategy.parentTfsaPerSchoolYear)} au CELI du parent par année scolaire</li>
                <li>Transfert du CELI ou du non enregistré du parent vers le REEE à 17 ans : {suggestion.strategy.topUpRespFromParent ? "oui" : "non"}</li>
              </ul>
              <p>
                Rente : <strong>{fmtMoney(suggestion.result.annuityReal)} / an</strong> (actuellement {fmtMoney(result.annuityReal)}).
                {" "}{suggestion.evaluated} stratégies évaluées.
              </p>
              <button type="button" className="primary" onClick={() => update({ ...inputs, ...suggestion.strategy })}>
                Appliquer
              </button>
            </div>
          )}

          <InputsPanel inputs={inputs} onChange={update} />
        </aside>

        <section className="results">
          <Summary inputs={inputs} result={result} noPse={noPse} />
          <div className="section-head">
            <h2>Évolution des comptes</h2>
            <DollarToggle mode={dollarMode} onChange={setDollarMode} />
          </div>
          <BalanceChart result={result} mode={dollarMode} />
          <AuditTable result={result} mode={dollarMode} />
          <TransferLog result={result} mode={dollarMode} />
          <h2>Sensibilité</h2>
          <SensitivityTable grid={grid} currentReturn={inputs.realReturn} currentPayout={inputs.annuityPayoutRate} />
          <Hypotheses />
        </section>
      </main>
    </div>
  );
}
