import { realAnnuityPaymentAfter } from "../engine/annuity";
import { ANNUITY_AGE, HOME_AGE } from "../engine/defaults";
import { nominalReturn } from "../engine/simulate";
import type { Inputs, Result } from "../engine/types";
import { fmtMoney, fmtPct } from "./format";

interface Props {
  inputs: Inputs;
  result: Result;
  noPse: Result;
}

export function Summary({ inputs, result, noPse }: Props) {
  const erosion = [10, 20, 25].map((y) => ({
    age: ANNUITY_AGE + y,
    value: realAnnuityPaymentAfter(result.annuityReal, y, inputs.inflation),
  }));
  const earlyStart = inputs.respStartAge < inputs.schoolStartAge && inputs.respPerYear > 0;

  return (
    <section className="summary">
      <div className="headline">
        <p>Au lieu de {inputs.schoolYears} ans d'école privée à {fmtMoney(inputs.schoolCostPerYear)} par année, vous pourriez
          {result.homeDownPaymentReal > 0 ? ` donner à votre enfant une mise de fonds pour sa première maison à ${HOME_AGE} ans de` : " plutôt investir cet argent."}</p>
        {result.homeDownPaymentReal > 0 && <p className="big">{fmtMoney(result.homeDownPaymentReal)}</p>}
        <p>Ou encore, en laissant l'argent fructifier, votre enfant pourrait s'acheter à {ANNUITY_AGE} ans une rente d'environ</p>
        <p className="big">{fmtMoney(result.annuityReal)} <span>/ an</span></p>
        <p>soit {fmtMoney(result.annuityReal / 12)} par mois, achetée avec une épargne de {fmtMoney(result.capitalAtAnnuityReal)}. Tous les montants sont en dollars constants (pouvoir d'achat d'aujourd'hui).</p>
      </div>

      <dl className="kpis">
        <div><dt>Coût total de l'école</dt><dd>{fmtMoney(result.totalSchoolCostReal)}</dd></div>
        <div><dt>Subventions REEE (SCEE + IQEE)</dt><dd>{fmtMoney(result.totalGrants)}</dd></div>
        <div><dt>Capital à {ANNUITY_AGE} ans (dollars constants)</dt><dd>{fmtMoney(result.capitalAtAnnuityReal)}</dd></div>
        <div><dt>Capital à {ANNUITY_AGE} ans (dollars courants)</dt><dd>{fmtMoney(result.capitalAtAnnuityNominal)}</dd></div>
        <div><dt>Impôts payés en cours de route</dt><dd>{fmtMoney(result.totalTaxReal)}</dd></div>
        <div><dt>Rendement réel (après frais)</dt><dd>{fmtPct(inputs.realReturn)}</dd></div>
        <div><dt>Inflation</dt><dd>{fmtPct(inputs.inflation)}</dd></div>
        <div><dt>Rendement nominal</dt><dd>{fmtPct(nominalReturn(inputs))}</dd></div>
      </dl>

      <div className="notes">
        <h3>Pouvoir d'achat de la rente</h3>
        <p>
          Rente non indexée : avec {fmtPct(inputs.inflation)} d'inflation, le paiement annuel vaudra{" "}
          {erosion.map((e, i) => (
            <span key={e.age}>
              {fmtMoney(e.value)} à {e.age} ans{i < erosion.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>

        <h3>Et si l'enfant ne fait pas d'études postsecondaires?</h3>
        <p>
          Les subventions sont remboursées et les revenus du REEE sont imposés au taux du parent plus 20 %. La rente
          tomberait à environ <strong>{fmtMoney(noPse.annuityReal)} / an</strong>.
        </p>

        {earlyStart && (
          <p className="warn">
            Cotisations au REEE dès {inputs.respStartAge} ans pour aller chercher plus de subventions. Ces montants sont
            déduits du budget de l'école des années suivantes : le total versé reste égal aux frais de scolarité. Les
            montants en dollars constants sont exprimés à l'âge {inputs.respStartAge}.
          </p>
        )}
        {result.unrepaidAdvanceReal > 1 && (
          <p className="warn">
            Attention : les cotisations anticipées dépassent le budget de l'école de {fmtMoney(result.unrepaidAdvanceReal)} à
            la fin du secondaire. Ce montant sort de la poche du parent en plus des frais de scolarité.
          </p>
        )}
      </div>
    </section>
  );
}
