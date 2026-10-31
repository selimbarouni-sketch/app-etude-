import { useState } from "react";
import { FolderPlus, NotebookPen, Plus, Search, Star, Trash2, X } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Dossier, Note } from "../types";
import { Confirmation, Field, Modal, Vide } from "../components";
import { formatDate } from "../utils";

export default function Notes() {
  const d = useDonnees();
  const [q, setQ] = useState("");
  const [dossier, setDossier] = useState<string | null>(null);
  const [edition, setEdition] = useState<Note | "nouvelle" | null>(null);
  const [nouveauDossier, setNouveauDossier] = useState(false);
  const [noteASupprimer, setNoteASupprimer] = useState<Note | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = useState<Dossier | null>(null);

  const s = q.toLowerCase();
  const notes = d.notes
    .filter((n) => (dossier === null || n.dossierId === dossier) && (!s || (n.titre + " " + n.contenu).toLowerCase().includes(s)))
    .sort((a, b) => Number(b.estFavori) - Number(a.estFavori) || b.date - a.date);

  return (
    <>
      <div className="topbar">
        <h1>Bloc-notes</h1>
        <button className="btn secondary" onClick={() => setNouveauDossier(true)}><FolderPlus size={18} />Dossier</button>
        <button className="btn" onClick={() => setEdition("nouvelle")}><Plus size={18} />Note</button>
      </div>
      <div className="search" style={{ marginBottom: 12 }}>
        <Search size={18} />
        <input className="input" placeholder="Rechercher dans les notes…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${dossier === null ? "on" : ""}`} onClick={() => setDossier(null)}>Toutes</button>
        {d.dossiers.map((x) => (
          <span key={x.id} className={`chip ${dossier === x.id ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <button style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", font: "inherit" }} onClick={() => setDossier(x.id)}>📁 {x.nom}</button>
            {dossier === x.id && (
              <button aria-label="Supprimer le dossier" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", display: "flex" }} onClick={() => setDossierASupprimer(x)}><X size={14} /></button>
            )}
          </span>
        ))}
      </div>

      {notes.length === 0 ? (
        <Vide icone={<NotebookPen size={48} />} texte="Aucune note ici." />
      ) : (
        <div className="notes-grid">
          {notes.map((n) => (
            <div key={n.id} className="card note-card" style={{ cursor: "pointer" }} onClick={() => setEdition(n)}>
              <div className="row">
                <div className="bold grow ellipsis">{n.titre || "Sans titre"}</div>
                <button className="icon-btn" style={{ width: 30, height: 30, color: n.estFavori ? "#f5a623" : undefined }} aria-label="Favori"
                  onClick={(e) => { e.stopPropagation(); actions.basculerFavori(n.id); }}>
                  <Star size={17} fill={n.estFavori ? "currentColor" : "none"} />
                </button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Supprimer"
                  onClick={(e) => { e.stopPropagation(); setNoteASupprimer(n); }}><Trash2 size={16} /></button>
              </div>
              <p>{n.contenu}</p>
              <div className="tiny muted">{formatDate(n.date)}{n.dossierId && ` · 📁 ${d.dossiers.find((x) => x.id === n.dossierId)?.nom ?? ""}`}</div>
            </div>
          ))}
        </div>
      )}

      {edition && <FormNote note={edition === "nouvelle" ? null : edition} dossierCourant={dossier} onClose={() => setEdition(null)} />}
      {nouveauDossier && <FormDossier onClose={() => setNouveauDossier(false)} />}
      {noteASupprimer && <Confirmation titre="Supprimer cette note ?" message={noteASupprimer.titre || "Sans titre"} onConfirm={() => actions.supprimerNote(noteASupprimer.id)} onClose={() => setNoteASupprimer(null)} />}
      {dossierASupprimer && (
        <Confirmation titre={`Supprimer le dossier ${dossierASupprimer.nom} ?`} message="Les notes du dossier sont conservées (elles ne seront plus rangées)."
          onConfirm={() => { actions.supprimerDossier(dossierASupprimer.id); setDossier(null); }} onClose={() => setDossierASupprimer(null)} />
      )}
    </>
  );
}

function FormNote({ note, dossierCourant, onClose }: { note: Note | null; dossierCourant: string | null; onClose: () => void }) {
  const d = useDonnees();
  const [titre, setTitre] = useState(note?.titre ?? "");
  const [contenu, setContenu] = useState(note?.contenu ?? "");
  const [dossierId, setDossierId] = useState<string>(note?.dossierId ?? dossierCourant ?? "");
  const [fav, setFav] = useState(note?.estFavori ?? false);
  return (
    <Modal titre={note ? "Modifier la note" : "Nouvelle note"} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!titre.trim() && !contenu.trim()} onClick={() => {
          actions.enregistrerNote({ id: note?.id, titre: titre.trim(), contenu: contenu.trim(), dossierId: dossierId || null, estFavori: fav });
          onClose();
        }}>Enregistrer</button></>}>
      <Field label="Titre"><input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus /></Field>
      <Field label="Contenu"><textarea className="input" style={{ minHeight: 180 }} value={contenu} onChange={(e) => setContenu(e.target.value)} /></Field>
      <div className="fields-2">
        <Field label="Dossier">
          <select className="input" value={dossierId} onChange={(e) => setDossierId(e.target.value)}>
            <option value="">Aucun dossier</option>
            {d.dossiers.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </select>
        </Field>
        <label className="row" style={{ alignSelf: "end", padding: "10px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} /> Favori
        </label>
      </div>
    </Modal>
  );
}

function FormDossier({ onClose }: { onClose: () => void }) {
  const [nom, setNom] = useState("");
  return (
    <Modal titre="Nouveau dossier" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!nom.trim()} onClick={() => { actions.ajouterDossier(nom.trim()); onClose(); }}>Créer</button></>}>
      <Field label="Nom du dossier"><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}
