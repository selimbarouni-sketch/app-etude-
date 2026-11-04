import { useState } from "react";
import { BookOpen, ClipboardPen, Pencil, Plus, Trash2 } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Eleve, EntreeCahier, Evaluation, Groupe } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { depuisInputDate, formatDate, formatJourCourt, lireNombre, versInputDate } from "../utils";

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
export function CahierGroupe({ groupe }: { groupe: Groupe }) {
  const d = useDonnees();
  const [edition, setEdition] = useState<EntreeCahier | "nouveau" | null>(null);
  const entrees = d.cahier.filter((c) => c.groupe === groupe.nom).sort((a, b) => b.date - a.date);
  return (
    <div className="stack">
      <div className="row">
        <div className="small muted grow">Ce qui a été fait à chaque séance et les devoirs donnés (aussi saisissables pendant l'appel).</div>
        <button className="btn small" onClick={() => setEdition("nouveau")}><Plus size={15} />Ajouter</button>
      </div>
      {entrees.length === 0 ? <Vide icone={<BookOpen size={40} />} texte="Cahier de texte vide." /> : entrees.map((c) => (
        <div key={c.id} className="card pad stack" style={{ gap: 4 }}>
          <div className="row">
            <span className="badge blue">{formatJourCourt(c.date)}</span>
            <span className="grow" />
            <button className="icon-btn" aria-label="Modifier" onClick={() => setEdition(c)}><Pencil size={15} /></button>
          </div>
          {c.chapitre && <div><b>Fait en séance :</b> {c.chapitre}</div>}
          {c.devoirs && <div className="small"><b>Devoirs{c.pourLe ? ` pour le ${formatJourCourt(c.pourLe)}` : ""} :</b> {c.devoirs}</div>}
        </div>
      ))}
      {edition && <FormCahier groupe={groupe} entree={edition === "nouveau" ? null : edition} onClose={() => setEdition(null)} />}
    </div>
  );
}

function FormCahier({ groupe, entree, onClose }: { groupe: Groupe; entree: EntreeCahier | null; onClose: () => void }) {
  const [date, setDate] = useState(versInputDate(entree?.date ?? Date.now()));
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
      <Field label="Chapitre / ce qui a été fait"><textarea className="input" value={chapitre} onChange={(e) => setChapitre(e.target.value)} placeholder="ex. Suites numériques : raisonnement par récurrence" /></Field>
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
