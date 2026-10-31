import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, CalendarX, Clock, MapPin, Plus, RotateCcw, Trash2 } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { RendezVous } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { debutDuJour, depuisInputDate, formatDateLongue, formatDuree, lireNombre, versInputDate } from "../utils";

export default function Agenda() {
  const d = useDonnees();
  const [ajout, setAjout] = useState(false);
  const [aSupprimer, setASupprimer] = useState<RendezVous | null>(null);
  const [voirPasses, setVoirPasses] = useState(false);
  const [aReporter, setAReporter] = useState<RendezVous | null>(null);
  const [aAnnuler, setAAnnuler] = useState<RendezVous | null>(null);

  const debut = debutDuJour(Date.now());
  const { aVenir, passes } = useMemo(() => {
    const aVenir = d.rendezVous.filter((r) => r.date >= debut).sort((a, b) => a.date - b.date);
    const passes = d.rendezVous.filter((r) => r.date < debut).sort((a, b) => b.date - a.date);
    return { aVenir, passes };
  }, [d.rendezVous, debut]);

  // Regroupement par jour
  const parJour = (liste: RendezVous[]) => {
    const m = new Map<number, RendezVous[]>();
    liste.forEach((r) => {
      const j = debutDuJour(r.date);
      m.set(j, [...(m.get(j) ?? []), r]);
    });
    return Array.from(m.entries());
  };

  const carte = (r: RendezVous, passe = false) => (
    <div key={r.id} className="card item" style={passe || r.annule ? { opacity: 0.6 } : undefined}>
      <span className="badge blue">{r.heure}</span>
      <div className="grow">
        <div className="bold ellipsis" style={r.annule ? { textDecoration: "line-through" } : undefined}>{r.nomEleve}</div>
        <div className="small muted row wrap" style={{ gap: 10 }}>
          {r.annule && <span className="badge red">Annulée</span>}
          <span className="row" style={{ gap: 4 }}><Clock size={13} />{formatDuree(r.dureeHeures)} h</span>
          <span className="row" style={{ gap: 4 }}><MapPin size={13} />{r.lieu}</span>
        </div>
        {r.remarque && <div className="tiny muted">{r.remarque}</div>}
      </div>
      <button className="icon-btn" title="Reporter" aria-label="Reporter" onClick={() => setAReporter(r)}><CalendarClock size={17} /></button>
      {r.annule ? (
        <button className="icon-btn" title="Rétablir la séance" aria-label="Rétablir" onClick={() => { actions.annulerRendezVous(r.id, false); toast("Séance rétablie"); }}><RotateCcw size={17} /></button>
      ) : (
        <button className="icon-btn" title="Annuler la séance" aria-label="Annuler la séance" onClick={() => setAAnnuler(r)}><CalendarX size={17} /></button>
      )}
      <button className="icon-btn" title="Supprimer" aria-label="Supprimer" onClick={() => setASupprimer(r)}><Trash2 size={17} /></button>
    </div>
  );

  return (
    <>
      <div className="topbar">
        <h1>Agenda</h1>
        <button className="btn" onClick={() => setAjout(true)}><Plus size={18} />Nouveau rendez-vous</button>
      </div>

      {aVenir.length === 0 ? (
        <Vide icone={<CalendarDays size={48} />} texte="Aucun rendez-vous à venir." />
      ) : (
        <div className="stack">
          {parJour(aVenir).map(([jour, liste]) => (
            <div key={jour}>
              <div className="bold small" style={{ color: "var(--primary)", margin: "6px 2px" }}>
                {jour === debut ? "Aujourd'hui — " : ""}{formatDateLongue(jour)}
              </div>
              <div className="list">{liste.map((r) => carte(r))}</div>
            </div>
          ))}
        </div>
      )}

      {passes.length > 0 && (
        <>
          <div className="section-title">
            <h2>Passés ({passes.length})</h2>
            <button className="btn ghost small" onClick={() => setVoirPasses(!voirPasses)}>{voirPasses ? "Masquer" : "Afficher"}</button>
          </div>
          {voirPasses && <div className="list">{passes.map((r) => carte(r, true))}</div>}
        </>
      )}

      {ajout && <FormRdv onClose={() => setAjout(false)} />}
      {aReporter && <Reporter rdv={aReporter} onClose={() => setAReporter(null)} />}
      {aAnnuler && (
        <Confirmation
          titre="Annuler cette séance ?"
          libelle="Annuler la séance"
          message={`${aAnnuler.nomEleve} — ${formatDateLongue(aAnnuler.date)} à ${aAnnuler.heure}. Elle restera visible (barrée) et pourra être rétablie.`}
          onConfirm={() => { actions.annulerRendezVous(aAnnuler.id, true); toast("Séance annulée"); }}
          onClose={() => setAAnnuler(null)}
        />
      )}
      {aSupprimer && (
        <Confirmation
          titre="Supprimer ce rendez-vous ?"
          message={`${aSupprimer.nomEleve} — ${formatDateLongue(aSupprimer.date)} à ${aSupprimer.heure}`}
          onConfirm={() => actions.supprimerRendezVous(aSupprimer.id)}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}

function FormRdv({ onClose }: { onClose: () => void }) {
  const d = useDonnees();
  const options = [
    ...d.eleves.map((e) => ({ id: e.id, nom: `${e.prenom} ${e.nom}`, label: `${e.prenom} ${e.nom} (${e.classe})` })),
    ...d.groupes.map((g) => ({ id: "", nom: `Groupe : ${g.nom}`, label: /^groupe/i.test(g.nom) ? g.nom : `Groupe ${g.nom}` })),
  ];
  const [choix, setChoix] = useState(options.length ? "0" : "autre");
  const [autre, setAutre] = useState("");
  const [jour, setJour] = useState(versInputDate(Date.now()));
  const [heure, setHeure] = useState("16:00");
  const [duree, setDuree] = useState(String(d.reglages.dureeParDefautHeures));
  const [lieu, setLieu] = useState("À domicile");
  const [remarque, setRemarque] = useState("");

  const opt = choix === "autre" ? null : options[Number(choix)];
  const nom = opt ? opt.nom : autre.trim();

  return (
    <Modal
      titre="Nouveau rendez-vous"
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!nom || !jour || !heure} onClick={() => {
          actions.ajouterRendezVous({
            eleveId: opt?.id || null, nomEleve: nom, jour: depuisInputDate(jour), heure,
            dureeHeures: lireNombre(duree, d.reglages.dureeParDefautHeures), lieu: lieu.trim(), remarque: remarque.trim(),
          });
          toast("Rendez-vous enregistré");
          onClose();
        }}>Enregistrer</button></>}
    >
      <Field label="Élève ou groupe">
        <select className="input" value={choix} onChange={(e) => setChoix(e.target.value)}>
          {options.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
          <option value="autre">Autre (saisir un nom)…</option>
        </select>
      </Field>
      {choix === "autre" && <Field label="Nom"><input className="input" value={autre} onChange={(e) => setAutre(e.target.value)} autoFocus /></Field>}
      <div className="fields-2">
        <Field label="Date"><input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
        <Field label="Heure"><input className="input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></Field>
      </div>
      <div className="fields-2">
        <Field label="Durée (h)"><input className="input" inputMode="decimal" value={duree} onChange={(e) => setDuree(e.target.value)} /></Field>
        <Field label="Lieu"><input className="input" value={lieu} onChange={(e) => setLieu(e.target.value)} /></Field>
      </div>
      <Field label="Remarque / objet"><input className="input" value={remarque} onChange={(e) => setRemarque(e.target.value)} /></Field>
    </Modal>
  );
}

function Reporter({ rdv, onClose }: { rdv: RendezVous; onClose: () => void }) {
  const [jour, setJour] = useState(versInputDate(rdv.date));
  const [heure, setHeure] = useState(rdv.heure);
  return (
    <Modal
      titre="Reporter la séance"
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!jour || !heure} onClick={() => {
          actions.reporterRendezVous(rdv.id, depuisInputDate(jour), heure);
          toast("Séance reportée");
          onClose();
        }}>Reporter</button></>}
    >
      <div className="bold">{rdv.nomEleve}</div>
      <div className="small muted">Actuellement : {formatDateLongue(rdv.date)} à {rdv.heure}</div>
      <div className="fields-2">
        <Field label="Nouvelle date"><input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
        <Field label="Nouvelle heure"><input className="input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
