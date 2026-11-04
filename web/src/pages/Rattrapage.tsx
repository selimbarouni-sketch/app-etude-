import { useState } from "react";
import { actions, creneauOccupe, useDonnees } from "../store";
import type { Eleve } from "../types";
import { Field, Modal, toast } from "../components";
import { combinerDateHeure, depuisInputDate, formatJourCourt, versInputDate } from "../utils";

/** Programmer une séance de rattrapage individuelle pour un élève. */
export function FormRattrapage({ eleve, onClose }: { eleve: Eleve; onClose: () => void }) {
  const d = useDonnees();
  const g = d.groupes.find((x) => x.nom.trim().toLowerCase() === eleve.groupe.trim().toLowerCase());
  const [jour, setJour] = useState(versInputDate(Date.now() + 86_400_000));
  const [debut, setDebut] = useState("10:00");
  const duree = (() => { if (!g) return 120; const [a, b] = g.heureDebut.split(":").map(Number); const [c, e] = g.heureFin.split(":").map(Number); return (c * 60 + e) - (a * 60 + b) || 120; })();
  const finDe = (h: string) => { const [a, b] = h.split(":").map(Number); const t = Math.min(23 * 60 + 59, a * 60 + b + duree); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const [fin, setFin] = useState(finDe("10:00"));
  const [comptee, setComptee] = useState(true);
  const [motif, setMotif] = useState("");
  const jourMs = jour ? depuisInputDate(jour) : 0;
  const invalide = !jour || !debut || !fin || fin <= debut;
  const conflit = invalide ? null : creneauOccupe(d, jourMs + 3_600_000, debut, fin);
  const prevus = d.rattrapages.filter((r) => r.eleveId === eleve.id && !r.statut && r.debut > Date.now() - 86_400_000).sort((a, b) => a.debut - b.debut);

  return (
    <Modal titre={`Rattrapage — ${eleve.prenom} ${eleve.nom}`} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Fermer</button>
        <button className="btn" disabled={invalide || !!conflit} onClick={() => {
          actions.ajouterRattrapage({ eleveId: eleve.id, debut: combinerDateHeure(jourMs, debut), heureDebut: debut, heureFin: fin, comptee, motif: motif.trim() });
          toast("Rattrapage programmé"); onClose();
        }}>Programmer</button></>}>
      <div className="fields-3">
        <Field label="Date"><input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
        <Field label="Début"><input className="input" type="time" value={debut} onChange={(e) => { setDebut(e.target.value); setFin(finDe(e.target.value)); }} /></Field>
        <Field label="Fin"><input className="input" type="time" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
      </div>
      {conflit && <div className="alert red small"><div>Créneau déjà occupé par {conflit}.</div></div>}
      <Field label="Motif"><input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex. absence du 12/11, révision avant contrôle" /></Field>
      <label className="row small" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={comptee} onChange={(e) => setComptee(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span className="grow">Compter comme séance à payer</span>
      </label>
      {prevus.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <div className="small bold muted">Rattrapages déjà prévus</div>
          {prevus.map((r) => (
            <div key={r.id} className="row small">
              <span className="grow">{formatJourCourt(r.debut)} · {r.heureDebut}–{r.heureFin}{r.motif && ` · ${r.motif}`}</span>
              <button className="btn ghost small" onClick={() => { actions.supprimerRattrapage(r.id); toast("Rattrapage supprimé"); }}>Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
