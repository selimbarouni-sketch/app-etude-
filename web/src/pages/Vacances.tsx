import { useState } from "react";
import { Palmtree, Trash2 } from "lucide-react";
import { actions, seancesDuJour, useDonnees } from "../store";
import { Field, Modal, toast } from "../components";
import { debutDuJour, depuisInputDate, formatJourCourt, versInputDate } from "../utils";
import MessageWhatsApp from "./MessageWhatsApp";

/** Vacances et jours fériés : toutes les séances de la période sont annulées. */
export default function SectionVacances() {
  const d = useDonnees();
  const [ajout, setAjout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const aVenir = d.vacances.filter((v) => v.fin + 86_400_000 > Date.now());

  return (
    <section className="card pad stack">
      <div className="row">
        <Palmtree size={18} />
        <div className="grow">
          <div className="bold">Vacances & jours fériés</div>
          <div className="tiny muted">Toutes les séances de la période sont annulées (pas d'appel, pas de rappel).</div>
        </div>
        <button className="btn small" onClick={() => setAjout(true)}>Ajouter</button>
      </div>
      {aVenir.length === 0 && <div className="small muted">Aucune période prévue.</div>}
      {aVenir.map((v) => (
        <div key={v.id} className="row small" style={{ gap: 6 }}>
          <span className="badge orange">{v.debut === v.fin ? formatJourCourt(v.debut) : `${formatJourCourt(v.debut)} → ${formatJourCourt(v.fin)}`}</span>
          <span className="grow">{v.motif}</span>
          <button className="icon-btn" aria-label="Supprimer" onClick={() => { actions.supprimerVacances(v.id); toast("Période supprimée : les séances sont rétablies"); }}><Trash2 size={16} /></button>
        </div>
      ))}
      {ajout && <AjoutVacances onClose={() => setAjout(false)} onFait={(m) => { setAjout(false); setMessage(m); }} />}
      {message !== null && <MessageWhatsApp messageInitial={message} onClose={() => setMessage(null)} />}
    </section>
  );
}

function AjoutVacances({ onClose, onFait }: { onClose: () => void; onFait: (message: string) => void }) {
  const d = useDonnees();
  const [debut, setDebut] = useState(versInputDate(Date.now()));
  const [fin, setFin] = useState(versInputDate(Date.now()));
  const [motif, setMotif] = useState("");
  const j1 = debut ? debutDuJour(depuisInputDate(debut)) : 0;
  const j2 = fin ? debutDuJour(depuisInputDate(fin)) : 0;
  const valide = debut && fin && j2 >= j1;
  // Nombre de séances concernées
  let nb = 0;
  if (valide) for (let j = j1; j <= j2 && j - j1 < 120 * 86_400_000; j += 86_400_000) nb += seancesDuJour(d, j + 3_600_000).filter((s) => !s.annulee).length;

  return (
    <Modal titre="Vacances / jour férié" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!valide} onClick={() => {
          actions.ajouterVacances({ debut: j1, fin: j2, motif: motif.trim() || "Vacances" });
          toast(`${nb} séance(s) annulée(s)`);
          const periode = j1 === j2 ? `le ${formatJourCourt(j1)}` : `du ${formatJourCourt(j1)} au ${formatJourCourt(j2)}`;
          onFait(`Bonjour {prenom}, pas de cours ${periode} (${motif.trim() || "vacances"}). Reprise des séances aux horaires habituels ensuite. Bonnes vacances !`);
        }}>Enregistrer</button></>}>
      <div className="fields-2">
        <Field label="Du"><input className="input" type="date" value={debut} onChange={(e) => { setDebut(e.target.value); if (e.target.value > fin) setFin(e.target.value); }} /></Field>
        <Field label="Au (inclus)"><input className="input" type="date" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} /></Field>
      </div>
      <Field label="Motif"><input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex. Vacances d'hiver, Aïd, examen…" /></Field>
      {valide && <div className="small muted">{nb} séance(s) seront annulées. Ensuite, un message WhatsApp vous sera proposé pour prévenir chaque groupe.</div>}
    </Modal>
  );
}
