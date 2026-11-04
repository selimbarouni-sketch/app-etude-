import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { actions, useDonnees } from "../store";
import { DemandeCode, Field, Modal, toast } from "../components";
import { telecharger } from "../utils";
import { sauvegardeEnLigne } from "../sync";

// On archive l'année qui vient de se terminer (ex. en juin ou septembre 2026 : « 2025-2026 »)
const anneeScolaire = () => { const a = new Date().getFullYear(); return `${a - 1}-${a}`; };

/** Paramètres > Nouvelle année scolaire : archive de l'année puis remise à zéro. */
export default function SectionNouvelleAnnee() {
  const d = useDonnees();
  const [ouvert, setOuvert] = useState(false);
  const [code, setCode] = useState(false);
  const [libelle, setLibelle] = useState(anneeScolaire());
  const [garderEleves, setGarderEleves] = useState(true);
  const [garderSoldes, setGarderSoldes] = useState(true);

  const lancer = async () => {
    // 1. Archive : fichier téléchargé + sauvegarde en ligne si la synchronisation est active
    telecharger(`ProfSuivi_archive_${libelle.replace(/[^\w-]+/g, "_")}.json`, JSON.stringify(d, null, 2), "application/json");
    const enLigne = await sauvegardeEnLigne(`Archive année ${libelle}`);
    // 2. Remise à zéro
    actions.nouvelleAnnee({ garderEleves, garderSoldes });
    toast(`Nouvelle année prête. Archive ${libelle} téléchargée${enLigne ? " et sauvegardée en ligne" : ""}.`);
    setOuvert(false);
  };

  return (
    <section className="card pad stack">
      <div className="row">
        <GraduationCap size={18} />
        <div className="grow">
          <div className="bold">Nouvelle année scolaire</div>
          <div className="tiny muted">Archive l'année terminée, puis repart avec un historique vide (groupes conservés).</div>
        </div>
        <button className="btn secondary small" onClick={() => setOuvert(true)}>Commencer</button>
      </div>
      {ouvert && (
        <Modal titre="Nouvelle année scolaire" onClose={() => setOuvert(false)}
          footer={<><button className="btn secondary" onClick={() => setOuvert(false)}>Annuler</button>
            <button className="btn danger" disabled={!libelle.trim()} onClick={() => setCode(true)}>Archiver et repartir à zéro</button></>}>
          <Field label="Année à archiver"><input className="input" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="2025-2026" /></Field>
          <div className="card pad small stack" style={{ gap: 4, boxShadow: "none" }}>
            <div className="bold">Ce qui va se passer :</div>
            <div>1. Un fichier d'archive de toute l'année est téléchargé{" "}(et une sauvegarde en ligne est créée si la synchronisation est active). Il pourra être restauré à tout moment.</div>
            <div>2. Sont effacés : séances et appels ({d.seances.length}), paiements ({d.paiements.length}), évaluations ({d.evaluations.length}), cahier de texte, rattrapages, vacances, reports/annulations.</div>
            <div>3. Sont conservés : groupes et leurs créneaux, réglages, personnalisation, notes du bloc-notes.</div>
          </div>
          <label className="row small" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={garderEleves} onChange={(e) => setGarderEleves(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span className="grow">Garder les élèves ({d.eleves.length}) dans leurs groupes</span>
          </label>
          {garderEleves && (
            <label className="row small" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={garderSoldes} onChange={(e) => setGarderSoldes(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span className="grow">Reporter les soldes (séances non payées et crédits) sur la nouvelle année</span>
            </label>
          )}
        </Modal>
      )}
      {code && (
        <DemandeCode titre="Confirmer la nouvelle année ?" message="Saisissez le code d'accès pour archiver l'année et repartir à zéro." libelle="Confirmer"
          onValide={lancer} onClose={() => setCode(false)} />
      )}
    </section>
  );
}
