import { useState, type ChangeEvent } from "react";
import { MessageCircle, MessageSquare, Pencil, Phone, Share2, Trash2 } from "lucide-react";
import { actions, heureProchainCours, useDonnees } from "../store";
import type { Eleve, Groupe } from "../types";
import { DemandeCode, Field, Modal, toast } from "../components";
import { formatDate, initiales, lienSms, lienTel, lienWhatsapp, remplirModele } from "../utils";

/** Fiche d'un élève : informations, contact, modification et suppression (code d'accès). */
export function FicheEleve({ eleveId, onClose }: { eleveId: string; onClose: () => void }) {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [edition, setEdition] = useState(false);
  const [supprimer, setSupprimer] = useState(false);
  const e = d.eleves.find((x) => x.id === eleveId);
  if (!e) return null;
  const nbPaye = d.paiements.filter((p) => p.eleveId === e.id).reduce((s, p) => s + p.montant, 0);
  const message = remplirModele(d.reglages.smsTemplateRappel, { prenom: e.prenom, nom: e.nom, classe: e.classe, heure: heureProchainCours(d, e) });

  if (edition) return <FormEleve eleve={e} groupes={d.groupes} onClose={() => setEdition(false)} />;
  if (supprimer) return (
    <DemandeCode
      titre={`Supprimer ${e.prenom} ${e.nom} ?`}
      message="Cette action est définitive. Saisissez le code d'accès pour confirmer. L'historique des séances et des paiements est conservé."
      libelle="Supprimer"
      onValide={() => { actions.supprimerEleve(e.id); toast("Élève supprimé"); onClose(); }}
      onClose={() => setSupprimer(false)}
    />
  );

  return (
    <Modal titre={`${e.prenom} ${e.nom}`} onClose={onClose}>
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
        <a className="btn secondary" href={lienSms(e.telephone, message)}><MessageSquare size={17} />SMS</a>
        <a className="btn secondary" href={lienWhatsapp(e.telephone, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>
        <button className="btn secondary" onClick={() => partagerContact(e)}><Share2 size={17} />Partager</button>
        <button className="btn secondary" onClick={() => setEdition(true)}><Pencil size={17} />Modifier</button>
        <button className="btn secondary" style={{ color: "var(--red)" }} onClick={() => setSupprimer(true)}><Trash2 size={17} />Supprimer</button>
      </div>
    </Modal>
  );
}

function partagerContact(e: Eleve) {
  const texte = `Contact élève :\n${e.prenom} ${e.nom}\nClasse : ${e.classe}\nTél : ${e.telephone}`;
  if (navigator.share) navigator.share({ text: texte }).catch(() => {});
  else navigator.clipboard.writeText(texte).then(() => toast("Contact copié dans le presse-papier"));
}

export function FormEleve({ eleve, groupes, groupeParDefaut, onClose }: { eleve: Eleve | null; groupes: Groupe[]; groupeParDefaut?: string; onClose: () => void }) {
  const [f, setF] = useState({
    nom: eleve?.nom ?? "",
    prenom: eleve?.prenom ?? "",
    telephone: eleve?.telephone ?? "",
    classe: eleve?.classe ?? "",
    groupe: eleve?.groupe ?? groupeParDefaut ?? groupes[0]?.nom ?? "",
    anniversaire: eleve?.anniversaire ?? "",
    observation: eleve?.observation ?? "",
  });
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const valide = [f.nom, f.prenom, f.telephone, f.classe, f.groupe].every((v) => v.trim());

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
      <Field label="Groupe *">
        <input className="input" value={f.groupe} onChange={set("groupe")} placeholder="Choisir ci-dessous" />
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
