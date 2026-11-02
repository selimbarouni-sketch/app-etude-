import { useMemo, useState } from "react";
import { Clock, MapPin, MessageCircle, Pencil, Plus, Search, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { actions, useDonnees } from "../store";
import MessageWhatsApp from "./MessageWhatsApp";
import type { Eleve, Groupe } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { JOURS, initiales, libelleCycle } from "../utils";

const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function Groupes() {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<Groupe | null>(null);
  const [ajoutDans, setAjoutDans] = useState<Groupe | null>(null);
  const [detail, setDetail] = useState<Groupe | null>(null);
  const [aSupprimer, setASupprimer] = useState<Groupe | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  const elevesDe = (g: Groupe) => d.eleves.filter((e) => memeNom(e.groupe, g.nom)).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  const sansGroupe = d.eleves.filter((e) => !d.groupes.some((g) => memeNom(g.nom, e.groupe)));
  const groupeDetail = detail && d.groupes.find((g) => g.id === detail.id);

  return (
    <>
      <div className="topbar">
        <h1>Groupes ({d.groupes.length})</h1>
        <button className="btn" onClick={() => setCreation(true)}><Plus size={18} />Nouveau groupe</button>
      </div>

      {sansGroupe.length > 0 && d.groupes.length > 0 && (
        <div className="alert blue small" style={{ marginBottom: 14 }}>
          <Users size={18} />
          <div className="grow">{sansGroupe.length} élève(s) ne sont dans aucun groupe.</div>
        </div>
      )}

      {d.groupes.length === 0 ? (
        <Vide icone={<Users size={48} />} texte="Aucun groupe pour le moment."
          action={<button className="btn" onClick={() => setCreation(true)}><Plus size={18} />Créer un groupe</button>} />
      ) : (
        <div className="groupes-grid">
          {d.groupes.map((g) => {
            const eleves = elevesDe(g);
            return (
              <div key={g.id} className="card groupe-card">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div className="grow" style={{ cursor: "pointer" }} onClick={() => setDetail(g)}>
                    <h3 className="groupe-nom">{g.nom}</h3>
                    <div className="small muted row wrap" style={{ gap: 10, marginTop: 4 }}>
                      <span className="row" style={{ gap: 4 }}><Clock size={13} />{g.jourSemaine} · {g.heureDebut}–{g.heureFin}</span>
                      {g.lieu && <span className="row" style={{ gap: 4 }}><MapPin size={13} />{g.lieu}</span>}
                    </div>
                  </div>
                  <button className="icon-btn" aria-label="Modifier le groupe" onClick={() => setEdition(g)}><Pencil size={16} /></button>
                  <button className="icon-btn" aria-label="Supprimer le groupe" onClick={() => setASupprimer(g)}><Trash2 size={16} /></button>
                </div>

                <div className="pile-avatars" onClick={() => setDetail(g)}>
                  {eleves.length === 0 ? (
                    <span className="small muted">Aucun élève</span>
                  ) : (
                    <>
                      {eleves.slice(0, 6).map((e) => <span key={e.id} className="avatar" title={`${e.prenom} ${e.nom}`}>{initiales(e.prenom, e.nom)}</span>)}
                      <span className="small muted" style={{ marginLeft: 10 }}>{eleves.length} élève{eleves.length > 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>

                <div className="groupe-actions">
                  <button className="btn small" onClick={() => setAjoutDans(g)}><UserPlus size={15} />Ajouter des élèves</button>
                  <button className="btn secondary small" disabled={!eleves.length} onClick={() => setWhatsapp(g.nom)}><MessageCircle size={15} />WhatsApp</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creation && (
        <FormGroupe
          onClose={() => setCreation(false)}
          onCree={(g) => { setCreation(false); setAjoutDans(g); }}
        />
      )}
      {edition && <FormGroupe groupe={edition} onClose={() => setEdition(null)} />}
      {ajoutDans && <AjoutEleves groupe={ajoutDans} onClose={() => setAjoutDans(null)} />}
      {whatsapp && <MessageWhatsApp groupeInitial={whatsapp} onClose={() => setWhatsapp(null)} />}

      {groupeDetail && (
        <Modal titre={groupeDetail.nom} onClose={() => setDetail(null)}
          footer={<button className="btn" onClick={() => { setDetail(null); setAjoutDans(groupeDetail); }}><UserPlus size={17} />Ajouter des élèves</button>}>
          <div className="small muted">Chaque {groupeDetail.jourSemaine.toLowerCase()} · {groupeDetail.heureDebut}–{groupeDetail.heureFin}{groupeDetail.lieu && ` · ${groupeDetail.lieu}`}</div>
          {elevesDe(groupeDetail).length === 0 ? (
            <div className="muted">Aucun élève dans ce groupe.</div>
          ) : (
            <div className="list">
              {elevesDe(groupeDetail).map((e) => (
                <div key={e.id} className="item" style={{ padding: "6px 0" }}>
                  <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initiales(e.prenom, e.nom)}</span>
                  <div className="grow">
                    <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                    <div className="tiny muted">{e.classe} · {e.telephone}</div>
                  </div>
                  <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
                  <button className="icon-btn" title="Retirer du groupe" aria-label="Retirer du groupe"
                    onClick={() => { actions.retirerDuGroupe(e.id); toast(`${e.prenom} retiré(e) du groupe`); }}><UserMinus size={17} /></button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {aSupprimer && (
        <Confirmation
          titre={`Supprimer le groupe ${aSupprimer.nom} ?`}
          message="Le groupe et son créneau seront supprimés. Les élèves sont conservés et passent « sans groupe »."
          onConfirm={() => { actions.supprimerGroupe(aSupprimer.id); toast("Groupe supprimé"); }}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}

/** Création ou modification d'un groupe. Après création, on enchaîne sur l'ajout d'élèves. */
export function FormGroupe({ groupe, onClose, onCree }: { groupe?: Groupe; onClose: () => void; onCree?: (g: Groupe) => void }) {
  const d = useDonnees();
  const [nom, setNom] = useState(groupe?.nom ?? "");
  const [jour, setJour] = useState(groupe?.jourSemaine ?? "Samedi");
  const [debut, setDebut] = useState(groupe?.heureDebut ?? "14:00");
  const [fin, setFin] = useState(groupe?.heureFin ?? "16:00");
  const [lieu, setLieu] = useState(groupe?.lieu ?? "Salle principale");
  const doublon = d.groupes.some((g) => g.id !== groupe?.id && memeNom(g.nom, nom));
  const valide = nom.trim() && !doublon;

  const enregistrer = () => {
    if (!valide) return;
    const infos = { nom: nom.trim(), jourSemaine: jour, heureDebut: debut, heureFin: fin, lieu: lieu.trim() };
    if (groupe) {
      actions.modifierGroupe({ ...groupe, ...infos });
      toast("Groupe modifié");
      onClose();
    } else {
      const g = actions.ajouterGroupe(infos);
      toast(`Groupe « ${g.nom} » créé`);
      if (onCree) onCree(g); else onClose();
    }
  };

  return (
    <Modal
      titre={groupe ? "Modifier le groupe" : "Nouveau groupe"}
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!valide} onClick={enregistrer}>{groupe ? "Enregistrer" : "Créer et ajouter des élèves"}</button></>}
    >
      {!groupe && <div className="etapes"><span className="on">1. Le groupe</span><span>2. Les élèves</span></div>}
      <Field label="Nom du groupe *">
        <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Bac Math — samedi" autoFocus />
      </Field>
      {doublon && <div className="tiny" style={{ color: "var(--red)" }}>Un groupe porte déjà ce nom.</div>}
      <Field label="Jour de la semaine">
        <div className="chips">
          {JOURS.map((j) => <button key={j} type="button" className={`chip ${jour === j ? "on" : ""}`} onClick={() => setJour(j)}>{j}</button>)}
        </div>
      </Field>
      <div className="fields-2">
        <Field label="Début"><input className="input" type="time" value={debut} onChange={(e) => setDebut(e.target.value)} /></Field>
        <Field label="Fin"><input className="input" type="time" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
      </div>
      <Field label="Lieu"><input className="input" value={lieu} onChange={(e) => setLieu(e.target.value)} /></Field>
    </Modal>
  );
}

type Ligne = { prenom: string; nom: string; telephone: string; classe: string };
const ligneVide = (classe = ""): Ligne => ({ prenom: "", nom: "", telephone: "", classe });

/** Ajout d'un ou plusieurs élèves à un groupe : élèves existants et/ou nouveaux élèves. */
export function AjoutEleves({ groupe, onClose }: { groupe: Groupe; onClose: () => void }) {
  const d = useDonnees();
  const [onglet, setOnglet] = useState<"existants" | "nouveaux">(d.eleves.some((e) => !memeNom(e.groupe, groupe.nom)) ? "existants" : "nouveaux");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);

  const candidats = useMemo(() => {
    const s = q.trim().toLowerCase();
    return d.eleves
      .filter((e) => !memeNom(e.groupe, groupe.nom))
      .filter((e) => !s || [e.nom, e.prenom, e.classe, e.groupe].some((v) => v.toLowerCase().includes(s)))
      .sort((a, b) => Number(!!a.groupe) - Number(!!b.groupe) || (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  }, [d.eleves, groupe.nom, q]);

  const lignesValides = lignes.filter((l) => l.prenom.trim() && l.nom.trim());
  const lignesIncompletes = lignes.filter((l) => (l.prenom.trim() || l.nom.trim() || l.telephone.trim()) && !(l.prenom.trim() && l.nom.trim()));
  const total = sel.length + lignesValides.length;

  const majLigne = (i: number, k: keyof Ligne, v: string) => setLignes(lignes.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const basculer = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  const valider = () => {
    if (sel.length) actions.affecterEleves(groupe.nom, sel);
    if (lignesValides.length) {
      actions.ajouterEleves(lignesValides.map((l) => ({
        prenom: l.prenom.trim(), nom: l.nom.trim(), telephone: l.telephone.trim(), classe: l.classe.trim(),
        groupe: groupe.nom, anniversaire: "", observation: "",
      })));
    }
    toast(`${total} élève${total > 1 ? "s" : ""} ajouté${total > 1 ? "s" : ""} à ${groupe.nom}`);
    onClose();
  };

  return (
    <Modal
      titre={`Ajouter des élèves — ${groupe.nom}`}
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>{total ? "Annuler" : "Plus tard"}</button>
        <button className="btn" disabled={!total || lignesIncompletes.length > 0} onClick={valider}>Ajouter {total || ""} élève{total > 1 ? "s" : ""}</button></>}
    >
      <div className="etapes"><span>1. Le groupe</span><span className="on">2. Les élèves</span></div>
      <div className="tabs" style={{ marginBottom: 0 }}>
        <button className={onglet === "existants" ? "on" : ""} onClick={() => setOnglet("existants")}>Élèves existants{sel.length ? ` (${sel.length})` : ""}</button>
        <button className={onglet === "nouveaux" ? "on" : ""} onClick={() => setOnglet("nouveaux")}>Nouveaux élèves{lignesValides.length ? ` (${lignesValides.length})` : ""}</button>
      </div>

      {onglet === "existants" ? (
        candidats.length === 0 && !q ? (
          <div className="muted small">Tous vos élèves sont déjà dans ce groupe. Utilisez l'onglet « Nouveaux élèves ».</div>
        ) : (
          <>
            <div className="search">
              <Search size={18} />
              <input className="input" placeholder="Rechercher un élève…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {candidats.length > 1 && (
              <button className="btn ghost small" style={{ alignSelf: "flex-start" }}
                onClick={() => setSel(candidats.every((e) => sel.includes(e.id)) ? sel.filter((id) => !candidats.some((e) => e.id === id)) : Array.from(new Set([...sel, ...candidats.map((e) => e.id)])))}>
                {candidats.every((e) => sel.includes(e.id)) ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
            <div className="list" style={{ gap: 2 }}>
              {candidats.map((e: Eleve) => (
                <label key={e.id} className={`ligne-choix ${sel.includes(e.id) ? "on" : ""}`}>
                  <input type="checkbox" checked={sel.includes(e.id)} onChange={() => basculer(e.id)} />
                  <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initiales(e.prenom, e.nom)}</span>
                  <span className="grow">
                    <span className="bold">{e.prenom} {e.nom}</span>
                    <span className="tiny muted" style={{ display: "block" }}>{e.classe}</span>
                  </span>
                  {e.groupe ? <span className="badge orange" title="Sera déplacé dans ce groupe">{e.groupe}</span> : <span className="badge green">Sans groupe</span>}
                </label>
              ))}
            </div>
            {sel.some((id) => d.eleves.find((e) => e.id === id)?.groupe) && (
              <div className="tiny muted">Les élèves déjà dans un autre groupe y seront déplacés (un élève appartient à un seul groupe).</div>
            )}
          </>
        )
      ) : (
        <>
          {lignes.map((l, i) => (
            <div key={i} className="card ligne-eleve">
              <div className="row">
                <span className="small bold muted grow">Élève {i + 1}</span>
                {lignes.length > 1 && <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Retirer" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}><X size={15} /></button>}
              </div>
              <div className="fields-2">
                <input className="input" placeholder="Prénom *" value={l.prenom} onChange={(e) => majLigne(i, "prenom", e.target.value)} autoFocus={i === lignes.length - 1} />
                <input className="input" placeholder="Nom *" value={l.nom} onChange={(e) => majLigne(i, "nom", e.target.value)} />
                <input className="input" placeholder="Téléphone" type="tel" inputMode="tel" value={l.telephone} onChange={(e) => majLigne(i, "telephone", e.target.value)} />
                <input className="input" placeholder="Classe" value={l.classe} onChange={(e) => majLigne(i, "classe", e.target.value)} />
              </div>
            </div>
          ))}
          {lignesIncompletes.length > 0 && <div className="tiny" style={{ color: "var(--red)" }}>Le prénom et le nom sont obligatoires pour chaque élève.</div>}
          <button className="btn secondary" onClick={() => setLignes([...lignes, ligneVide(lignes[lignes.length - 1]?.classe ?? "")])}>
            <Plus size={17} />Ajouter un autre élève
          </button>
        </>
      )}
    </Modal>
  );
}
