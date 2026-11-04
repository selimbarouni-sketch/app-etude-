import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarX, ChevronRight, Clock, MapPin, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { actions, chevauchementCreneau, chevauchementLe, finApres, heureProchainCours, prochainesSeances, seancesAVenirDuGroupe, useDonnees } from "../store";
import { FicheEleve, FormEleve } from "./Eleves";
import MessageWhatsApp from "./MessageWhatsApp";
import type { Eleve, Groupe } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { JOURS, debutDuJour, depuisInputDate, formatDateLongue, formatJourCourt, initiales, libelleCycle, lienTel, lienWhatsapp, remplirModele, versInputDate } from "../utils";

const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const SANS = "__sans_groupe__";

/**
 * Groupes & élèves : on choisit toujours un groupe, puis on voit la liste de ses élèves.
 * Les élèves ne sont jamais affichés mélangés.
 */
export default function Groupes({ groupeInitial, ajoutEleve, finAjout }: { groupeInitial?: string | null; ajoutEleve?: boolean; finAjout?: () => void }) {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [ouvert, setOuvert] = useState<string | null>(groupeInitial ?? null);
  const [creation, setCreation] = useState(false);
  const [q, setQ] = useState("");
  const [nouvelEleve, setNouvelEleve] = useState<string | null>(null); // nom du groupe pré-rempli
  const [fiche, setFiche] = useState<string | null>(null);
  const [ajoutDans, setAjoutDans] = useState<Groupe | null>(null);

  useEffect(() => { if (groupeInitial) setOuvert(groupeInitial); }, [groupeInitial]);
  useEffect(() => {
    if (ajoutEleve) { setNouvelEleve((d.groupes.find((g) => g.id === ouvert)?.nom) ?? d.groupes[0]?.nom ?? ""); finAjout?.(); }
  }, [ajoutEleve]); // eslint-disable-line react-hooks/exhaustive-deps

  const elevesDe = (g: Groupe) => d.eleves.filter((e) => memeNom(e.groupe, g.nom)).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  const sansGroupe = d.eleves.filter((e) => !d.groupes.some((g) => memeNom(g.nom, e.groupe))).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));

  const modales = (
    <>
      {creation && <FormGroupe onClose={() => setCreation(false)} onCree={(g) => { setCreation(false); setOuvert(g.id); setAjoutDans(g); }} />}
      {ajoutDans && <AjoutEleves groupe={ajoutDans} onClose={() => setAjoutDans(null)} />}
      {nouvelEleve !== null && <FormEleve eleve={null} groupes={d.groupes} groupeParDefaut={nouvelEleve} onClose={() => setNouvelEleve(null)} />}
      {fiche && <FicheEleve eleveId={fiche} onClose={() => setFiche(null)} />}
    </>
  );

  // ---------- Vue d'un groupe : liste de ses élèves ----------
  const groupe = d.groupes.find((g) => g.id === ouvert);
  if (ouvert && (groupe || ouvert === SANS)) {
    return (
      <>
        {groupe
          ? <DetailGroupe groupe={groupe} eleves={elevesDe(groupe)} onRetour={() => setOuvert(null)} onFiche={setFiche}
              onAjouterEleve={() => setNouvelEleve(groupe.nom)} onAjouterEleves={() => setAjoutDans(groupe)} />
          : <ListeSansGroupe eleves={sansGroupe} limite={limite} onRetour={() => setOuvert(null)} onFiche={setFiche} />}
        {modales}
      </>
    );
  }

  // ---------- Liste des groupes ----------
  const s = q.trim().toLowerCase();
  const resultats = s
    ? d.eleves.filter((e) => [e.nom, e.prenom, e.classe, e.telephone].some((v) => v.toLowerCase().includes(s)))
    : [];
  const resultatsParGroupe = Array.from(new Set(resultats.map((e) => e.groupe || ""))).map((nom) => ({
    nom: nom || "Sans groupe",
    groupe: d.groupes.find((g) => memeNom(g.nom, nom)),
    eleves: resultats.filter((e) => (e.groupe || "") === nom),
  }));

  return (
    <>
      <div className="topbar">
        <h1>Groupes ({d.groupes.length})</h1>
        <button className="btn" onClick={() => setCreation(true)}><Plus size={18} />Nouveau groupe</button>
      </div>

      <div className="search" style={{ marginBottom: 14 }}>
        <Search size={18} />
        <input className="input" placeholder="Rechercher un élève…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {s ? (
        resultats.length === 0 ? <div className="card pad muted">Aucun élève trouvé.</div> : (
          <div className="stack">
            {resultatsParGroupe.map((r) => (
              <div key={r.nom} className="card pad">
                <button className="groupe-titre" onClick={() => setOuvert(r.groupe?.id ?? SANS)}>{r.nom} ›</button>
                {r.eleves.map((e) => (
                  <div key={e.id} className="item clickable" style={{ padding: "8px 2px" }} onClick={() => setFiche(e.id)}>
                    <span className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initiales(e.prenom, e.nom)}</span>
                    <div className="grow ellipsis">{e.prenom} {e.nom} <span className="muted small">· {e.classe}</span></div>
                    <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      ) : d.groupes.length === 0 ? (
        <Vide icone={<Users size={48} />} texte="Aucun groupe pour le moment."
          action={<button className="btn" onClick={() => setCreation(true)}><Plus size={18} />Créer un groupe</button>} />
      ) : (
        <div className="groupes-grid">
          {d.groupes.map((g) => {
            const eleves = elevesDe(g);
            const aPayer = eleves.filter((e) => e.sessionsInCurrentCycle >= limite).length;
            const prochaine = prochainesSeances(d, Date.now(), g.id, 1)[0];
            return (
              <button key={g.id} className="card groupe-card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setOuvert(g.id)}>
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div className="grow">
                    <h3 className="groupe-nom">{g.nom}</h3>
                    <div className="small muted row wrap" style={{ gap: 10, marginTop: 4 }}>
                      <span className="row" style={{ gap: 4 }}><Clock size={13} />{g.jourSemaine} · {g.heureDebut}–{g.heureFin}</span>
                      {g.lieu && <span className="row" style={{ gap: 4 }}><MapPin size={13} />{g.lieu}</span>}
                    </div>
                  </div>
                  <ChevronRight size={20} className="muted" />
                </div>
                <div className="pile-avatars">
                  {eleves.length === 0 ? <span className="small muted">Aucun élève</span> : (
                    <>
                      {eleves.slice(0, 6).map((e) => <span key={e.id} className="avatar" title={`${e.prenom} ${e.nom}`}>{initiales(e.prenom, e.nom)}</span>)}
                      <span className="small muted" style={{ marginLeft: 10 }}>{eleves.length} élève{eleves.length > 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
                <div className="row wrap small" style={{ gap: 6 }}>
                  {prochaine && <span className="badge blue">Prochaine : {formatJourCourt(prochaine.debut)} {prochaine.heureDebut}{prochaine.reportDe ? " (reportée)" : ""}</span>}
                  {aPayer > 0 && <span className="badge red">{aPayer} à payer</span>}
                  {chevauchementCreneau(d, g, g.id) && <span className="badge orange">⚠ chevauche {chevauchementCreneau(d, g, g.id)!.nom}</span>}
                </div>
              </button>
            );
          })}
          {sansGroupe.length > 0 && (
            <button className="card groupe-card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setOuvert(SANS)}>
              <h3 className="groupe-nom" style={{ color: "var(--muted)" }}>Élèves sans groupe</h3>
              <div className="small muted">{sansGroupe.length} élève(s) à placer dans un groupe</div>
            </button>
          )}
        </div>
      )}
      {modales}
    </>
  );
}

function ListeSansGroupe({ eleves, limite, onRetour, onFiche }: { eleves: Eleve[]; limite: number; onRetour: () => void; onFiche: (id: string) => void }) {
  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onRetour} aria-label="Retour aux groupes"><ArrowLeft size={20} /></button>
        <h1>Élèves sans groupe</h1>
      </div>
      <div className="alert blue small" style={{ marginBottom: 12 }}><div>Ouvrez la fiche d'un élève puis « Modifier » pour le placer dans un groupe, ou utilisez « Ajouter des élèves » depuis un groupe.</div></div>
      <ListeEleves eleves={eleves} limite={limite} onFiche={onFiche} />
    </>
  );
}

function ListeEleves({ eleves, limite, onFiche }: { eleves: Eleve[]; limite: number; onFiche: (id: string) => void }) {
  const d = useDonnees();
  if (eleves.length === 0) return <div className="card pad muted small">Aucun élève dans ce groupe.</div>;
  return (
    <div className="list">
      {eleves.map((e) => {
        const msg = remplirModele(d.reglages.smsTemplateRappel, { prenom: e.prenom, nom: e.nom, classe: e.classe, heure: heureProchainCours(d, e) });
        return (
          <div key={e.id} className="card item clickable" onClick={() => onFiche(e.id)}>
            <div className="avatar">{initiales(e.prenom, e.nom)}</div>
            <div className="grow">
              <div className="bold ellipsis">{e.prenom} {e.nom}</div>
              <div className="small muted ellipsis">{[e.classe, e.telephone].filter(Boolean).join(" · ")}</div>
            </div>
            <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
            <div className="row" onClick={(ev) => ev.stopPropagation()} style={{ gap: 0 }}>
              <a className="icon-btn" href={lienTel(e.telephone)} aria-label="Appeler"><Phone size={18} /></a>
              <a className="icon-btn" href={lienWhatsapp(e.telephone, msg)} target="_blank" rel="noreferrer" aria-label="WhatsApp" style={{ color: "var(--green)" }}><MessageCircle size={18} /></a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Page d'un groupe : infos, séances (annuler/reporter), liste des élèves. */
function DetailGroupe({ groupe, eleves, onRetour, onFiche, onAjouterEleve, onAjouterEleves }: {
  groupe: Groupe; eleves: Eleve[]; onRetour: () => void; onFiche: (id: string) => void; onAjouterEleve: () => void; onAjouterEleves: () => void;
}) {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState(false);
  const [supprimer, setSupprimer] = useState(false);
  const [whatsapp, setWhatsapp] = useState<string | null>(null); // message pré-rempli
  const [modifSeance, setModifSeance] = useState(false);
  const [retirer, setRetirer] = useState(false);

  const filtres = eleves.filter((e) => !q || [e.nom, e.prenom, e.classe].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const prochaines = prochainesSeances(d, Date.now(), groupe.id, 3);
  const exceptions = (groupe.exceptions ?? []).filter((x) => Math.max(x.date, x.nouvelleDate ?? 0) + 86_400_000 > Date.now()).sort((a, b) => a.date - b.date);

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onRetour} aria-label="Retour aux groupes"><ArrowLeft size={20} /></button>
        <h1 className="ellipsis">{groupe.nom}</h1>
        <button className="icon-btn" onClick={() => setEdition(true)} aria-label="Modifier le groupe"><Pencil size={18} /></button>
        <button className="icon-btn" onClick={() => setSupprimer(true)} aria-label="Supprimer le groupe"><Trash2 size={18} /></button>
      </div>

      <div className="card pad stack" style={{ gap: 8, marginBottom: 12 }}>
        <div className="small row wrap" style={{ gap: 12 }}>
          <span className="row" style={{ gap: 4 }}><Clock size={14} />Chaque {groupe.jourSemaine.toLowerCase()} · {groupe.heureDebut}–{groupe.heureFin}</span>
          {groupe.lieu && <span className="row" style={{ gap: 4 }}><MapPin size={14} />{groupe.lieu}</span>}
        </div>
        {prochaines.length > 0 && (
          <div className="small">Prochaines séances : {prochaines.map((p) => `${formatJourCourt(p.debut)} ${p.heureDebut}${p.reportDe ? " (reportée)" : ""}`).join(" · ")}</div>
        )}
        {exceptions.map((x) => (
          <div key={x.id} className="row small" style={{ gap: 6 }}>
            <span className={`badge ${x.type === "annulee" ? "red" : "orange"}`}>{x.type === "annulee" ? "Annulée" : "Reportée"}</span>
            <span className="grow">
              {formatJourCourt(x.date)}
              {x.type === "reportee" && x.nouvelleDate && <> → {formatJourCourt(x.nouvelleDate)} à {x.nouvelleHeure}</>}
              {x.motif && <span className="muted"> · {x.motif}</span>}
            </span>
            <button className="btn ghost small" onClick={() => { actions.supprimerException(groupe.id, x.id); toast("Séance rétablie"); }}>Rétablir</button>
          </div>
        ))}
        <div className="groupe-actions">
          <button className="btn small" onClick={onAjouterEleves}><UserPlus size={15} />Ajouter des élèves</button>
          <button className="btn secondary small" onClick={() => setModifSeance(true)}><CalendarX size={15} />Annuler / reporter</button>
          <button className="btn secondary small" disabled={!eleves.length} onClick={() => setWhatsapp(d.reglages.smsTemplateRappel)}><MessageCircle size={15} />WhatsApp</button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <div className="bold grow">Élèves ({eleves.length})</div>
        <button className="btn ghost small" onClick={onAjouterEleve}><Plus size={15} />Un élève</button>
        {eleves.length > 0 && <button className="btn ghost small" onClick={() => setRetirer(true)}><UserMinus size={15} />Retirer</button>}
      </div>
      {eleves.length > 5 && (
        <div className="search" style={{ marginBottom: 10 }}>
          <Search size={18} />
          <input className="input" placeholder={`Rechercher dans ${groupe.nom}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <ListeEleves eleves={filtres} limite={limite} onFiche={onFiche} />

      {edition && <FormGroupe groupe={groupe} onClose={() => setEdition(false)} />}
      {supprimer && (
        <Confirmation
          titre={`Supprimer le groupe ${groupe.nom} ?`}
          message="Le groupe et son créneau seront supprimés. Les élèves sont conservés et passent « sans groupe »."
          onConfirm={() => { actions.supprimerGroupe(groupe.id); toast("Groupe supprimé"); onRetour(); }}
          onClose={() => setSupprimer(false)}
        />
      )}
      {retirer && (
        <Modal titre={`Retirer des élèves de ${groupe.nom}`} onClose={() => setRetirer(false)}>
          {eleves.map((e) => (
            <div key={e.id} className="item" style={{ padding: "6px 0" }}>
              <div className="grow">{e.prenom} {e.nom}</div>
              <button className="btn ghost small" onClick={() => { actions.retirerDuGroupe(e.id); toast(`${e.prenom} retiré(e) du groupe`); }}><UserMinus size={15} />Retirer</button>
            </div>
          ))}
        </Modal>
      )}
      {modifSeance && (
        <AnnulerReporter groupe={groupe} onClose={() => setModifSeance(false)}
          onFait={(message) => { setModifSeance(false); if (eleves.length) setWhatsapp(message); }} />
      )}
      {whatsapp !== null && <MessageWhatsApp groupeInitial={groupe.nom} messageInitial={whatsapp} onClose={() => setWhatsapp(null)} />}
    </>
  );
}

/** Annuler ou reporter une séance du groupe, puis prévenir les élèves par WhatsApp. */
function AnnulerReporter({ groupe, onClose, onFait }: { groupe: Groupe; onClose: () => void; onFait: (message: string) => void }) {
  const d = useDonnees();
  const seances = seancesAVenirDuGroupe(d, groupe, 6).filter((s) => !s.reportDe);
  const [choix, setChoix] = useState<number | null>(seances.find((s) => !s.annulee)?.jour ?? null);
  const [type, setType] = useState<"annulee" | "reportee">("annulee");
  const [jour, setJour] = useState(versInputDate(Date.now() + 86_400_000));
  const [heure, setHeure] = useState(groupe.heureDebut);
  const [motif, setMotif] = useState("");
  const seance = seances.find((s) => s.jour === choix);
  const finReport = heure ? finApres(groupe, heure) : "";
  const conflitReport = seance && type === "reportee" && jour && heure
    ? chevauchementLe(d, depuisInputDate(jour), heure, finReport, groupe.id, seance.jour)
    : null;
  const valide = seance && (type === "annulee" || (jour && heure && !conflitReport));

  const valider = () => {
    if (!seance) return;
    const nouvelleDate = type === "reportee" ? debutDuJour(depuisInputDate(jour)) : undefined;
    actions.ajouterException(groupe.id, { date: seance.jour, type, nouvelleDate, nouvelleHeure: type === "reportee" ? heure : undefined, motif: motif.trim() });
    const quand = `${formatDateLongue(seance.debut).toLowerCase()} à ${seance.heureDebut}`;
    const message = type === "annulee"
      ? `Bonjour {prenom}, la séance du groupe ${groupe.nom} du ${quand} est annulée${motif.trim() ? ` (${motif.trim()})` : ""}. Merci de votre compréhension.`
      : `Bonjour {prenom}, la séance du groupe ${groupe.nom} du ${quand} est reportée au ${formatDateLongue(nouvelleDate!).toLowerCase()} à ${heure}${motif.trim() ? ` (${motif.trim()})` : ""}. Merci !`;
    toast(type === "annulee" ? "Séance annulée" : "Séance reportée");
    onFait(message);
  };

  return (
    <Modal titre={`Annuler ou reporter — ${groupe.nom}`} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Fermer</button>
        <button className="btn" disabled={!valide} onClick={valider}>{type === "annulee" ? "Annuler la séance" : "Reporter la séance"}</button></>}>
      <Field label="Quelle séance ?">
        <div className="chips">
          {seances.slice(0, 8).map((s) => (
            <button key={s.jour} type="button" disabled={!!s.annulee} className={`chip ${choix === s.jour ? "on" : ""}`}
              style={s.annulee ? { textDecoration: "line-through", opacity: 0.5 } : undefined} onClick={() => setChoix(s.jour)}>
              {formatJourCourt(s.debut)} {s.heureDebut}
            </button>
          ))}
          {seances.length === 0 && <span className="small muted">Aucune séance à venir.</span>}
        </div>
      </Field>
      <div className="tabs" style={{ marginBottom: 0 }}>
        <button className={type === "annulee" ? "on" : ""} onClick={() => setType("annulee")}>Annuler</button>
        <button className={type === "reportee" ? "on" : ""} onClick={() => setType("reportee")}>Reporter</button>
      </div>
      {type === "reportee" && (
        <div className="fields-2">
          <Field label="Nouvelle date"><input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
          <Field label="Nouvelle heure"><input className="input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></Field>
        </div>
      )}
      {conflitReport && (
        <div className="alert red small"><div>Impossible : ce jour-là, le groupe <b>{conflitReport.groupe.nom}</b> a cours de {conflitReport.heureDebut} à {conflitReport.heureFin}. La séance reportée ({heure}–{finReport}) le chevaucherait.</div></div>
      )}
      <Field label="Motif (facultatif, envoyé aux élèves)"><input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex. jour férié, examen…" /></Field>
      <div className="tiny muted">Ensuite, un message WhatsApp prêt à envoyer à chaque élève du groupe vous sera proposé.</div>
    </Modal>
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
  const horairesInvalides = !debut || !fin || fin <= debut;
  const conflit = horairesInvalides ? null : chevauchementCreneau(d, { jourSemaine: jour, heureDebut: debut, heureFin: fin }, groupe?.id);
  const valide = nom.trim() && !doublon && !horairesInvalides && !conflit;

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
      {horairesInvalides && <div className="tiny" style={{ color: "var(--red)" }}>L'heure de fin doit être après l'heure de début.</div>}
      {conflit && (
        <div className="alert red small"><div>Ce créneau chevauche le groupe <b>{conflit.nom}</b> ({conflit.jourSemaine} {conflit.heureDebut}–{conflit.heureFin}). Choisissez un autre jour ou d'autres horaires.</div></div>
      )}
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
