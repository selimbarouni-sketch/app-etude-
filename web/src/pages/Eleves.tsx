import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CalendarPlus, MessageCircle, MessageSquare, Pencil, Phone, Plus, Search, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { actions, heureProchainCours, useDonnees } from "../store";
import type { Eleve, Groupe } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { AjoutEleves, FormGroupe } from "./Groupes";
import { formatDate, formatJourCourt, initiales, lienSms, lienTel, lienWhatsapp, remplirModele, libelleCycle } from "../utils";

export default function Eleves({ ajoutInitial, finAjout }: { ajoutInitial: boolean; finAjout: () => void }) {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [vue, setVue] = useState<"tous" | "groupes">("tous");
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState<Eleve | "nouveau" | null>(ajoutInitial ? "nouveau" : null);
  const [detail, setDetail] = useState<Eleve | null>(null);
  const [aSupprimer, setASupprimer] = useState<Eleve | null>(null);
  const [nouveauGroupe, setNouveauGroupe] = useState(false);
  const [groupeASupprimer, setGroupeASupprimer] = useState<Groupe | null>(null);
  const [ajoutDans, setAjoutDans] = useState<Groupe | null>(null);

  useEffect(() => {
    if (ajoutInitial) setEdition("nouveau");
  }, [ajoutInitial]);

  const filtres = useMemo(() => {
    const s = q.trim().toLowerCase();
    const liste = [...d.eleves].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
    if (!s) return liste;
    return liste.filter((e) => [e.nom, e.prenom, e.classe, e.groupe, e.telephone].some((v) => v.toLowerCase().includes(s)));
  }, [d.eleves, q]);

  const message = (e: Eleve) =>
    remplirModele(d.reglages.smsTemplateRappel, { prenom: e.prenom, nom: e.nom, classe: e.classe, heure: heureProchainCours(d, e) });

  // Tous les groupes (même vides) + élèves sans groupe connu
  const parGroupe = useMemo(() => {
    const res: { nom: string; groupe?: Groupe; eleves: Eleve[] }[] = d.groupes.map((g) => ({
      nom: g.nom, groupe: g, eleves: filtres.filter((e) => e.groupe.toLowerCase() === g.nom.toLowerCase()),
    }));
    const autres = filtres.filter((e) => !d.groupes.some((g) => g.nom.toLowerCase() === e.groupe.toLowerCase()));
    const noms = Array.from(new Set(autres.map((e) => e.groupe || "Sans groupe")));
    noms.forEach((n) => res.push({ nom: n, eleves: autres.filter((e) => (e.groupe || "Sans groupe") === n) }));
    return res;
  }, [d.groupes, filtres]);

  return (
    <>
      <div className="topbar">
        <h1>Élèves ({d.eleves.length})</h1>
        <button className="btn secondary" onClick={() => setNouveauGroupe(true)}><Users size={18} />Nouveau groupe</button>
      </div>

      <div className="tabs">
        <button className={vue === "tous" ? "on" : ""} onClick={() => setVue("tous")}>Tous</button>
        <button className={vue === "groupes" ? "on" : ""} onClick={() => setVue("groupes")}>Par groupe</button>
      </div>

      <div className="search" style={{ marginBottom: 14 }}>
        <Search size={18} />
        <input className="input" placeholder="Rechercher un nom, une classe, un groupe, un téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {d.eleves.length === 0 ? (
        <Vide icone={<UserPlus size={48} />} texte="Aucun élève enregistré."
          action={<button className="btn" onClick={() => setEdition("nouveau")}><Plus size={18} />Ajouter un élève</button>} />
      ) : vue === "tous" ? (
        filtres.length === 0 ? <div className="card pad muted">Aucun résultat.</div> : (
          <div className="list">
            {filtres.map((e) => (
              <div key={e.id} className="card item clickable" onClick={() => setDetail(e)}>
                <div className="avatar">{initiales(e.prenom, e.nom)}</div>
                <div className="grow">
                  <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                  <div className="small muted ellipsis">{e.classe} · {e.groupe || "Sans groupe"} · {e.telephone}</div>
                </div>
                <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
                <div className="row" onClick={(ev) => ev.stopPropagation()} style={{ gap: 0 }}>
                  <a className="icon-btn" href={lienTel(e.telephone)} aria-label="Appeler"><Phone size={18} /></a>
                  <a className="icon-btn" href={lienWhatsapp(e.telephone, message(e))} target="_blank" rel="noreferrer" aria-label="WhatsApp" style={{ color: "var(--green)" }}><MessageCircle size={18} /></a>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="stack">
          {parGroupe.map((g) => (
            <div key={g.nom} className="card pad">
              <div className="row" style={{ marginBottom: 8 }}>
                <div className="grow">
                  <div className="bold" style={{ color: "var(--primary)", fontSize: 17 }}>{g.nom}</div>
                  <div className="small muted">
                    {g.groupe ? `Chaque ${g.groupe.jourSemaine.toLowerCase()} · ${g.groupe.heureDebut}–${g.groupe.heureFin} · ${g.groupe.lieu}` : "Aucun créneau configuré"}
                  </div>
                </div>
                <span className="badge blue">{g.eleves.length} élève(s)</span>
                {g.groupe && <button className="icon-btn" aria-label="Supprimer le groupe" onClick={() => setGroupeASupprimer(g.groupe!)}><Trash2 size={17} /></button>}
              </div>
              {g.eleves.length === 0 && <div className="small muted">Aucun élève dans ce groupe.</div>}
              {g.eleves.map((e) => (
                <div key={e.id} className="item clickable" style={{ padding: "8px 4px" }} onClick={() => setDetail(e)}>
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initiales(e.prenom, e.nom)}</div>
                  <div className="grow ellipsis">{e.prenom} {e.nom} <span className="muted small">· {e.classe}</span></div>
                  <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
                </div>
              ))}
              {g.groupe && (
                <button className="btn small block" style={{ marginTop: 8 }} onClick={() => setAjoutDans(g.groupe!)}>
                  <UserPlus size={16} />Ajouter des élèves
                </button>
              )}
              {g.groupe && (
                <button className="btn secondary small block" style={{ marginTop: 8 }}
                  onClick={() => {
                    const r = actions.programmerProchaineSeance(g.groupe!);
                    toast(r.dejaPresent ? "Cette séance est déjà dans l'agenda" : `Séance ajoutée à l'agenda : ${formatJourCourt(r.date)}`);
                  }}>
                  <CalendarPlus size={16} />Programmer la prochaine séance
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="btn fab" onClick={() => setEdition("nouveau")} aria-label="Ajouter un élève"><Plus size={22} /></button>

      {edition && (
        <FormEleve
          eleve={edition === "nouveau" ? null : edition}
          groupes={d.groupes}
          onClose={() => { setEdition(null); finAjout(); }}
        />
      )}

      {detail && (() => {
        const e = d.eleves.find((x) => x.id === detail.id) ?? detail;
        const nbPaye = d.paiements.filter((p) => p.eleveId === e.id).reduce((s, p) => s + p.montant, 0);
        return (
          <Modal titre={`${e.prenom} ${e.nom}`} onClose={() => setDetail(null)}>
            <div className="row">
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initiales(e.prenom, e.nom)}</div>
              <div>
                <div className="bold">{e.classe}</div>
                <div className="small muted">{e.groupe || "Sans groupe"} · inscrit le {formatDate(e.dateInscription)}</div>
              </div>
            </div>
            <div className="card pad stack" style={{ gap: 4, boxShadow: "none" }}>
              <div>📞 {e.telephone}</div>
              {e.anniversaire && <div>🎂 Anniversaire : {e.anniversaire}</div>}
              <div>{e.sessionsInCurrentCycle < 0 ? <>Séances payées d'avance : <b>{-e.sessionsInCurrentCycle}</b></> : <>Séances à payer : <b>{e.sessionsInCurrentCycle} / {limite}</b></>}</div>
              <div>Total séances : <b>{e.totalSeancesRealisees}</b></div>
              <div>Total payé : <b>{nbPaye.toLocaleString("fr-FR")} {d.reglages.devise}</b></div>
              {e.observation && <div className="muted small">Observation : {e.observation}</div>}
            </div>
            <div className="fields-2">
              <a className="btn secondary" href={lienTel(e.telephone)}><Phone size={17} />Appeler</a>
              <a className="btn secondary" href={lienSms(e.telephone, message(e))}><MessageSquare size={17} />SMS</a>
              <a className="btn secondary" href={lienWhatsapp(e.telephone, message(e))} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>
              <button className="btn secondary" onClick={() => partagerContact(e)}><Share2 size={17} />Partager</button>
              <button className="btn secondary" onClick={() => { setDetail(null); setEdition(e); }}><Pencil size={17} />Modifier</button>
              <button className="btn secondary" style={{ color: "var(--red)" }} onClick={() => { setDetail(null); setASupprimer(e); }}><Trash2 size={17} />Supprimer</button>
            </div>
          </Modal>
        );
      })()}

      {aSupprimer && (
        <Confirmation
          titre={`Supprimer ${aSupprimer.prenom} ${aSupprimer.nom} ?`}
          message="Cette action est définitive. L'historique des séances et des paiements est conservé."
          onConfirm={() => { actions.supprimerEleve(aSupprimer.id); toast("Élève supprimé"); }}
          onClose={() => setASupprimer(null)}
        />
      )}
      {groupeASupprimer && (
        <Confirmation
          titre={`Supprimer le groupe ${groupeASupprimer.nom} ?`}
          message="Le groupe et son créneau seront supprimés. Les élèves sont conservés et passent « sans groupe »."
          onConfirm={() => actions.supprimerGroupe(groupeASupprimer.id)}
          onClose={() => setGroupeASupprimer(null)}
        />
      )}
      {nouveauGroupe && <FormGroupe onClose={() => setNouveauGroupe(false)} onCree={(g) => { setNouveauGroupe(false); setAjoutDans(g); }} />}
      {ajoutDans && <AjoutEleves groupe={ajoutDans} onClose={() => setAjoutDans(null)} />}
    </>
  );
}

function partagerContact(e: Eleve) {
  const texte = `Contact élève :\n${e.prenom} ${e.nom}\nClasse : ${e.classe}\nTél : ${e.telephone}`;
  if (navigator.share) navigator.share({ text: texte }).catch(() => {});
  else navigator.clipboard.writeText(texte).then(() => toast("Contact copié dans le presse-papier"));
}

function FormEleve({ eleve, groupes, onClose }: { eleve: Eleve | null; groupes: Groupe[]; onClose: () => void }) {
  const [f, setF] = useState({
    nom: eleve?.nom ?? "",
    prenom: eleve?.prenom ?? "",
    telephone: eleve?.telephone ?? "",
    classe: eleve?.classe ?? "",
    groupe: eleve?.groupe ?? groupes[0]?.nom ?? "",
    anniversaire: eleve?.anniversaire ?? "",
    observation: eleve?.observation ?? "",
  });
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const valide = [f.nom, f.prenom, f.telephone, f.classe].every((v) => v.trim());

  const enregistrer = () => {
    if (!valide) return;
    const propre = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as typeof f;
    if (eleve) actions.modifierEleve({ ...eleve, ...propre });
    else actions.ajouterEleve(propre);
    toast(eleve ? "Élève modifié" : "Élève ajouté");
    onClose();
  };

  return (
    <Modal
      titre={eleve ? "Modifier l'élève" : "Ajouter un élève"}
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn" disabled={!valide} onClick={enregistrer}>{eleve ? "Enregistrer" : "Créer"}</button></>}
    >
      <div className="fields-2">
        <Field label="Prénom *"><input className="input" value={f.prenom} onChange={set("prenom")} autoFocus /></Field>
        <Field label="Nom *"><input className="input" value={f.nom} onChange={set("nom")} /></Field>
      </div>
      <div className="fields-2">
        <Field label="Téléphone *"><input className="input" type="tel" inputMode="tel" value={f.telephone} onChange={set("telephone")} /></Field>
        <Field label="Classe *"><input className="input" placeholder="ex. Bac Math, 3ème" value={f.classe} onChange={set("classe")} /></Field>
      </div>
      <Field label="Groupe">
        <input className="input" value={f.groupe} onChange={set("groupe")} placeholder="Saisir ou choisir ci-dessous" />
      </Field>
      {groupes.length > 0 && (
        <div className="chips">
          {groupes.map((g) => (
            <button key={g.id} type="button" className={`chip ${f.groupe.toLowerCase() === g.nom.toLowerCase() ? "on" : ""}`} onClick={() => setF({ ...f, groupe: g.nom })}>{g.nom}</button>
          ))}
        </div>
      )}
      <Field label="Anniversaire (jj/mm)"><input className="input" value={f.anniversaire} onChange={set("anniversaire")} placeholder="Facultatif" /></Field>
      <Field label="Observation"><textarea className="input" value={f.observation} onChange={set("observation")} /></Field>
    </Modal>
  );
}
