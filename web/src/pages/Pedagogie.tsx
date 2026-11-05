import { useState } from "react";
import { BookOpen, ClipboardPen, Pencil, Plus, Trash2 } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Eleve, EntreeCahier, Evaluation, Groupe } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { debutDuJour, depuisInputDate, formatDate, formatJourCourt, lireNombre, versInputDate } from "../utils";

const fmtNote = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Moyenne d'un élève sur 20 (évaluations où il a une note). */
export function moyenneEleve(evals: Evaluation[], eleveId: string): number | null {
  const notes = evals.filter((e) => typeof e.notes[eleveId] === "number").map((e) => ((e.notes[eleveId] as number) / e.sur) * 20);
  return notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
}

/** Moyenne de la classe pour une évaluation. */
export function moyenneEvaluation(ev: Evaluation): number | null {
  const n = Object.values(ev.notes).filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
}

// ---------- Cahier de texte ----------
/** Entrée du cahier de texte d'un groupe pour un jour donné. */
export const cahierDuJour = (cahier: EntreeCahier[], groupe: string, jour: number) =>
  cahier.find((c) => c.groupe === groupe && debutDuJour(c.date) === debutDuJour(jour));

/**
 * Cahier de texte du groupe : une ligne par séance faite (appel enregistré), avec sa description brève
 * et les devoirs. Les séances sans description sont signalées.
 */
export function CahierGroupe({ groupe }: { groupe: Groupe }) {
  const d = useDonnees();
  const [edition, setEdition] = useState<{ entree: EntreeCahier | null; jour?: number } | null>(null);

  const lignes = (() => {
    const jours = new Map<number, { jour: number; heure: string; presents: number; total: number }>();
    d.seances.filter((s) => s.groupe === groupe.nom).forEach((s) => {
      const j = debutDuJour(s.date);
      const x = jours.get(j) ?? { jour: j, heure: s.heure, presents: 0, total: 0 };
      x.total++; if (s.statut === "P" || s.statut === "R") x.presents++;
      jours.set(j, x);
    });
    // entrées saisies pour un jour sans appel (ex. ajoutées à la main)
    d.cahier.filter((c) => c.groupe === groupe.nom).forEach((c) => {
      const j = debutDuJour(c.date);
      if (!jours.has(j)) jours.set(j, { jour: j, heure: "", presents: 0, total: 0 });
    });
    return Array.from(jours.values()).sort((a, b) => b.jour - a.jour).map((x) => ({ ...x, entree: cahierDuJour(d.cahier, groupe.nom, x.jour) }));
  })();
  const sansDescription = lignes.filter((l) => l.total > 0 && !l.entree?.chapitre).length;

  return (
    <div className="stack">
      <div className="row">
        <div className="small muted grow">Une description brève de chaque séance et les devoirs donnés (saisissables aussi pendant l'appel).</div>
        <button className="btn small" onClick={() => setEdition({ entree: null })}><Plus size={15} />Ajouter</button>
      </div>
      {sansDescription > 0 && <div className="alert blue small"><div>{sansDescription} séance{sansDescription > 1 ? "s" : ""} sans description : touchez « Décrire » pour compléter.</div></div>}
      {lignes.length === 0 ? <Vide icone={<BookOpen size={40} />} texte="Aucune séance pour le moment." /> : lignes.map((l) => (
        <div key={l.jour} className="card pad stack" style={{ gap: 4 }}>
          <div className="row">
            <span className="badge blue">{formatJourCourt(l.jour)}{l.heure && ` · ${l.heure}`}</span>
            {l.total > 0 && <span className="tiny muted">{l.presents}/{l.total} présent{l.presents > 1 ? "s" : ""}</span>}
            <span className="grow" />
            <button className="btn ghost small" onClick={() => setEdition({ entree: l.entree ?? null, jour: l.jour })}>
              {l.entree ? <><Pencil size={14} />Modifier</> : <><Plus size={14} />Décrire</>}
            </button>
          </div>
          {l.entree?.chapitre ? <div>{l.entree.chapitre}</div> : <div className="small muted">Pas encore de description.</div>}
          {l.entree?.devoirs && <div className="small"><b>Devoirs{l.entree.pourLe ? ` pour le ${formatJourCourt(l.entree.pourLe)}` : ""} :</b> {l.entree.devoirs}</div>}
        </div>
      ))}
      {edition && <FormCahier groupe={groupe} entree={edition.entree} jour={edition.jour} onClose={() => setEdition(null)} />}
    </div>
  );
}

export function FormCahier({ groupe, entree, jour, onClose }: { groupe: Groupe | { nom: string }; entree: EntreeCahier | null; jour?: number; onClose: () => void }) {
  const [date, setDate] = useState(versInputDate(entree?.date ?? jour ?? Date.now()));
  const [chapitre, setChapitre] = useState(entree?.chapitre ?? "");
  const [devoirs, setDevoirs] = useState(entree?.devoirs ?? "");
  const [pourLe, setPourLe] = useState(entree?.pourLe ? versInputDate(entree.pourLe) : "");
  const [supprimer, setSupprimer] = useState(false);
  if (supprimer && entree) return <Confirmation titre="Supprimer cette entrée ?" message={formatDate(entree.date)} onConfirm={() => actions.supprimerCahier(entree.id)} onClose={onClose} />;
  return (
    <Modal titre={`Cahier de texte — ${groupe.nom}`} onClose={onClose}
      footer={<>{entree && <button className="btn ghost" style={{ marginRight: "auto", color: "var(--red)" }} onClick={() => setSupprimer(true)}><Trash2 size={15} />Supprimer</button>}
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!date || (!chapitre.trim() && !devoirs.trim())} onClick={() => {
          actions.enregistrerCahier({ id: entree?.id, groupe: groupe.nom, date: depuisInputDate(date), chapitre: chapitre.trim(), devoirs: devoirs.trim(), pourLe: pourLe ? depuisInputDate(pourLe) : undefined });
          toast("Cahier de texte enregistré"); onClose();
        }}>Enregistrer</button></>}>
      <Field label="Date de la séance"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Description brève de la séance"><textarea className="input" value={chapitre} onChange={(e) => setChapitre(e.target.value)} placeholder="ex. Suites numériques : raisonnement par récurrence, exercices 3 à 6" autoFocus /></Field>
      <Field label="Devoirs donnés"><textarea className="input" value={devoirs} onChange={(e) => setDevoirs(e.target.value)} placeholder="ex. Exercices 12 à 15 p. 84" /></Field>
      <Field label="Pour le"><input className="input" type="date" value={pourLe} onChange={(e) => setPourLe(e.target.value)} /></Field>
    </Modal>
  );
}

// ---------- Évaluations ----------
export function EvaluationsGroupe({ groupe, eleves }: { groupe: Groupe; eleves: Eleve[] }) {
  const d = useDonnees();
  const [edition, setEdition] = useState<Evaluation | "nouveau" | null>(null);
  const evals = d.evaluations.filter((e) => e.groupe === groupe.nom).sort((a, b) => b.date - a.date);
  return (
    <div className="stack">
      <div className="row">
        <div className="small muted grow">Devoirs et contrôles notés. Les moyennes apparaissent dans la fiche et le bilan PDF de chaque élève.</div>
        <button className="btn small" disabled={!eleves.length} onClick={() => setEdition("nouveau")}><Plus size={15} />Évaluation</button>
      </div>
      {evals.length > 0 && (
        <div className="card pad">
          <div className="small bold" style={{ marginBottom: 6 }}>Moyennes des élèves (sur 20)</div>
          {eleves.map((e) => {
            const m = moyenneEleve(evals, e.id);
            return (
              <div key={e.id} className="row small" style={{ padding: "3px 0" }}>
                <span className="grow">{e.prenom} {e.nom}</span>
                <span className={`badge ${m === null ? "" : m >= 10 ? "green" : "red"}`}>{m === null ? "—" : fmtNote(m)}</span>
              </div>
            );
          })}
        </div>
      )}
      {evals.length === 0 ? <Vide icone={<ClipboardPen size={40} />} texte="Aucune évaluation." /> : evals.map((ev) => {
        const m = moyenneEvaluation(ev);
        return (
          <button key={ev.id} className="card item clickable" style={{ textAlign: "left", width: "100%" }} onClick={() => setEdition(ev)}>
            <span className="badge blue">{formatJourCourt(ev.date)}</span>
            <div className="grow">
              <div className="bold ellipsis">{ev.titre}</div>
              <div className="tiny muted">Moyenne du groupe : {m === null ? "—" : `${fmtNote(m)} / ${ev.sur}`}</div>
            </div>
            <Pencil size={15} className="muted" />
          </button>
        );
      })}
      {edition && <FormEvaluation groupe={groupe} eleves={eleves} evaluation={edition === "nouveau" ? null : edition} onClose={() => setEdition(null)} />}
    </div>
  );
}

function FormEvaluation({ groupe, eleves, evaluation, onClose }: { groupe: Groupe; eleves: Eleve[]; evaluation: Evaluation | null; onClose: () => void }) {
  const [titre, setTitre] = useState(evaluation?.titre ?? "");
  const [date, setDate] = useState(versInputDate(evaluation?.date ?? Date.now()));
  const [sur, setSur] = useState(String(evaluation?.sur ?? 20));
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(eleves.map((e) => [e.id, typeof evaluation?.notes[e.id] === "number" ? String(evaluation!.notes[e.id]) : ""])));
  const [supprimer, setSupprimer] = useState(false);
  const bareme = lireNombre(sur, 20) || 20;
  const invalide = eleves.some((e) => notes[e.id] && (lireNombre(notes[e.id], -1) < 0 || lireNombre(notes[e.id], -1) > bareme));
  if (supprimer && evaluation) return <Confirmation titre="Supprimer cette évaluation ?" message={evaluation.titre} onConfirm={() => actions.supprimerEvaluation(evaluation.id)} onClose={onClose} />;
  return (
    <Modal titre={evaluation ? "Modifier l'évaluation" : "Nouvelle évaluation"} onClose={onClose}
      footer={<>{evaluation && <button className="btn ghost" style={{ marginRight: "auto", color: "var(--red)" }} onClick={() => setSupprimer(true)}><Trash2 size={15} />Supprimer</button>}
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!titre.trim() || !date || invalide} onClick={() => {
          actions.enregistrerEvaluation({
            id: evaluation?.id, groupe: groupe.nom, titre: titre.trim(), date: depuisInputDate(date), sur: bareme,
            notes: Object.fromEntries(eleves.map((e) => [e.id, notes[e.id]?.trim() ? lireNombre(notes[e.id], 0) : null])),
          });
          toast("Évaluation enregistrée"); onClose();
        }}>Enregistrer</button></>}>
      <Field label="Titre"><input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex. Contrôle n°2 — Fonctions" /></Field>
      <div className="fields-2">
        <Field label="Date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Noté sur"><input className="input" inputMode="decimal" value={sur} onChange={(e) => setSur(e.target.value)} /></Field>
      </div>
      <div className="small bold muted">Notes (laisser vide si absent)</div>
      {eleves.map((e) => {
        const v = notes[e.id] ?? "";
        const faux = v && (lireNombre(v, -1) < 0 || lireNombre(v, -1) > bareme);
        return (
          <div key={e.id} className="row">
            <span className="grow">{e.prenom} {e.nom}</span>
            <input className="input" style={{ width: 90, textAlign: "center", ...(faux ? { borderColor: "var(--red)" } : {}) }} inputMode="decimal" value={v}
              onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })} placeholder={`/ ${bareme}`} />
          </div>
        );
      })}
      {invalide && <div className="tiny" style={{ color: "var(--red)" }}>Une note dépasse le barème ({bareme}).</div>}
    </Modal>
  );
}
