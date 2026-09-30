export function Hypotheses() {
  return (
    <section className="hypotheses">
      <details>
        <summary>Hypothèses, règles et simplifications</summary>
        <h3>Règles utilisées (2026)</h3>
        <ul>
          <li>REEE : aucun plafond annuel de cotisation, plafond à vie de 50 000 $ par bénéficiaire.</li>
          <li>SCEE (fédéral) : 20 % des premiers 2 500 $ cotisés par année, jusqu'à 1 000 $ par année avec les droits inutilisés, maximum 7 200 $ à vie, jusqu'à la fin de l'année des 17 ans.</li>
          <li>IQEE (Québec) : 10 % des premiers 2 500 $, jusqu'à 500 $ par année avec rattrapage, maximum 3 600 $ à vie. La majoration pour familles à revenu modeste n'est pas incluse.</li>
          <li>À 16 et 17 ans, les subventions exigent au moins 2 000 $ cotisés avant la fin de l'année des 15 ans (ou 100 $ par année pendant 4 ans).</li>
          <li>Les droits aux subventions s'accumulent dès la naissance, même sans REEE.</li>
          <li>Paiements d'aide aux études (PAE = subventions + revenus) : imposés entre les mains de l'étudiant, maximum 8 000 $ pendant les 13 premières semaines. Le capital cotisé ressort libre d'impôt.</li>
          <li>Sans études postsecondaires : subventions remboursées, revenus imposés au taux du parent + 20 % (12 % fédéral + 8 % Québec).</li>
          <li>CELI : ouvert à partir de 18 ans, 7 000 $ par année (indexé).</li>
          <li>Gains en capital : inclusion à 50 %.</li>
          <li>Impôt fédéral et du Québec 2026 : paliers, montant personnel de base et abattement du Québec de 16,5 %. Les paliers sont indexés avec l'inflation choisie.</li>
        </ul>
        <h3>Simplifications</h3>
        <ul>
          <li>Tous les flux ont lieu en début d'année; les subventions sont versées la même année.</li>
          <li>Aucune cotisation REEE antérieure : tous les droits aux subventions accumulés depuis la naissance sont disponibles. Les droits CELI du parent et de l'enfant sont entièrement disponibles pour ce projet.</li>
          <li>Dollars constants : montants ramenés au pouvoir d'achat d'aujourd'hui. Dollars courants : montants réels de chaque année, inflation incluse.</li>
          <li>Les montants versés au REEE et au CELI du parent sont en dollars constants et suivent l'inflation, comme les frais de scolarité.</li>
          <li>Les distributions sont imposées comme du revenu ordinaire (pas de crédit pour dividendes ni pour impôt étranger).</li>
          <li>Les crédits pour frais de scolarité, les cotisations RRQ/AE et le Fonds des services de santé sont ignorés.</li>
          <li>Les plafonds du REEE et des subventions ne sont pas indexés (comme dans la loi); le plafond CELI l'est sans arrondi à 500 $.</li>
          <li>L'argent du parent est donné à l'enfant à 18 ans (aucune attribution pour un enfant majeur).</li>
          <li>À l'achat de la rente, les placements non enregistrés sont vendus; le gain est imposé par-dessus le revenu d'emploi de l'enfant. L'impôt sur les paiements de rente n'est pas calculé.</li>
          <li>Le taux de rente futur est supposé égal au taux actuel. En réalité, il dépendra des taux d'intérêt et de la longévité dans 50 ans.</li>
          <li>Rendement constant chaque année. Les vrais marchés fluctuent.</li>
        </ul>
        <h3>Ordre des retraits</h3>
        <ul>
          <li>Avant 18 ans, rien ne sort du REEE (sauf si les études finissent avant) : un mineur ne peut pas avoir de CELI, et un placement non enregistré à son nom doit contenir de l'argent qu'il a gagné lui-même.</li>
          <li>À 18 ans, le non enregistré du parent est vendu (gain imposé au taux du parent) et donné à l'enfant. Le garder plus longtemps coûterait de l'impôt au taux du parent sur les distributions chaque année.</li>
          <li>Ensuite, chaque année, on remplit les droits CELI de l'enfant dans cet ordre :
            <ol>
              <li>le non enregistré de l'enfant;</li>
              <li>le PAE : le plus grand de (droits CELI restants) et (revenus + subventions disponibles ÷ années d'études restantes). Le deuxième montant est un plancher qui étale la partie imposable sur les années d'études; ce qui dépasse les droits CELI va au non enregistré de l'enfant;</li>
              <li>le capital cotisé du REEE (non imposable);</li>
              <li>le CELI du parent, en dernier parce qu'il est déjà à l'abri de l'impôt.</li>
            </ol>
          </li>
          <li>La dernière année d'études, le REEE est vidé : le reste du PAE et tout le capital. Ce qui ne rentre pas dans le CELI va au non enregistré de l'enfant, puis passe au CELI les années suivantes.</li>
          <li>Si « Vider le CELI du parent à 18 ans » est coché, tout le CELI du parent est donné à 18 ans et ce qui ne rentre pas dans le CELI de l'enfant va dans son non enregistré.</li>
        </ul>
        <h3>Sources</h3>
        <ul>
          <li><a href="https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/taux-imposition-tranches-revenu/annee-en-cours.html" rel="noopener noreferrer" target="_blank">ARC : taux d'imposition 2026</a></li>
          <li><a href="https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/foire-questions-particuliers/rajustement-montants-fonction-indexation-impot-particuliers-prestations.html" rel="noopener noreferrer" target="_blank">ARC : montants indexés (montant personnel de base, CELI)</a></li>
          <li><a href="https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/taux-dimposition/" rel="noopener noreferrer" target="_blank">Revenu Québec : taux d'imposition 2026</a></li>
          <li>Emploi et Développement social Canada : Subvention canadienne pour l'épargne-études. Revenu Québec : Incitatif québécois à l'épargne-études.</li>
        </ul>
      </details>
      <p className="disclaimer">
        Outil éducatif seulement, pas un conseil financier ou fiscal. Aucune donnée n'est transmise : tous les calculs se font dans votre navigateur.
      </p>
    </section>
  );
}
