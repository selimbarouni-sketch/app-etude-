import { useState, type ChangeEvent } from "react";
import { CalendarPlus, FileText, Users, MessageCircle, MessageSquare, Pencil, Phone, Share2, Trash2 } from "lucide-react";
import { actions, destinataires, heureProchainCours, placesDuGroupe, prixSeance, useDonnees } from "../store";
import type { Eleve, Groupe } from "../types";
import { DemandeCode, Field, Modal, toast } from "../components";
import { FormRattrapage } from "./Rattrapage";
import { moyenneEleve } from "./Pedagogie";
import { partagerPdf } from "../partage";
import { parametreServeurPourLien, useSync } from "../sync";
import { nouveauJeton } from "../espaceParent";
import { formatDate, initiales, lienSms, lienTel, lienWhatsapp, remplirModele } from "../utils";

/** Fiche d'un élève : informations, contact, modification et suppression (code d'accès). */
export function FicheEleve({ eleveId, onClose }: { eleveId: string; onClose: () => void }) {
  const d = useDonnees();
  const limite = d.reglages.seancesParPaiement;
  const [edition, setEdition] = useState(false);
  const [supprimer, setSupprimer] = useState(false);
  const [rattrapage, setRattrapage] = useState(false);
  const e = d.eleves.find((x) => x.id === eleveId);
  if (!e) return null;
  const nbPaye = d.paiements.filter((p) => p.eleveId === e.id).reduce((s, p) => s + p.montant, 0);
  const message = remplirModele(d.reglages.smsTemplateRappel, { prenom: e.prenom, nom: e.nom, classe: e.classe, heure: heureProchainCours(d, e) });

  if (rattrapage) return <FormRattrapage eleve={e} onClose={() => setRattrapage(false)} />;
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
        {e.telephone && <div>📞 Élève : {e.telephone}</div>}
        {e.telephoneParent && <div>👪 {e.nomParent || "Parent"} : {e.telephoneParent}</div>}
        <div className="small muted">Messages envoyés à : {destinataires(e).map((x) => x.libelle).join(" et ") || "—"}</div>
        <div>Tarif : <b>{prixSeance(d, e).toLocaleString("fr-FR")} {d.reglages.devise}</b> / séance{e.remise ? ` (réduction ${e.remise} %)` : ""}</div>
        {e.anniversaire && <div>🎂 Anniversaire : {e.anniversaire}</div>}
        <div>{e.sessionsInCurrentCycle < 0 ? <>Séances payées d'avance : <b>{-e.sessionsInCurrentCycle}</b></> : <>Séances à payer : <b>{e.sessionsInCurrentCycle} / {limite}</b></>}</div>
        <div>Total séances : <b>{e.totalSeancesRealisees}</b></div>
        {(() => { const m = moyenneEleve(d.evaluations.filter((x) => x.groupe.trim().toLowerCase() === e.groupe.trim().toLowerCase()), e.id); return m === null ? null : <div>Moyenne : <b>{m.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} / 20</b></div>; })()}
        <div>Total payé : <b>{nbPaye.toLocaleString("fr-FR")} {d.reglages.devise}</b></div>
        {e.observation && <div className="muted small">Observation : {e.observation}</div>}
      </div>
      <LienParent eleve={e} />
      <div className="fields-2">
        {e.telephone && <a className="btn secondary" href={lienTel(e.telephone)}><Phone size={17} />Appeler</a>}
        {destinataires(e)[0] && <a className="btn secondary" href={lienSms(destinataires(e)[0].telephone, message)}><MessageSquare size={17} />SMS</a>}
        {e.telephone && <a className="btn secondary" href={lienWhatsapp(e.telephone, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp élève</a>}
        {e.telephoneParent && <a className="btn secondary" href={lienWhatsapp(e.telephoneParent, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp parent</a>}
        {e.telephoneParent && <a className="btn secondary" href={lienTel(e.telephoneParent)}><Phone size={17} />Appeler parent</a>}
        <button className="btn secondary" onClick={() => partagerContact(e)}><Share2 size={17} />Partager</button>
        <button className="btn secondary" onClick={async () => {
          const { bilanEleve } = await import("../pdf");
          const { blob, nom } = bilanEleve(d, e);
          const dest = destinataires(e)[0];
          await partagerPdf(new File([blob], nom, { type: "application/pdf" }), `Bonjour, voici le bilan de suivi de ${e.prenom}. Bonne lecture !`, dest?.telephone);
        }}><FileText size={17} />Bilan PDF</button>
        <button className="btn secondary" onClick={() => setRattrapage(true)}><CalendarPlus size={17} />Rattrapage</button>
        <button className="btn secondary" onClick={() => setEdition(true)}><Pencil size={17} />Modifier</button>
        <button className="btn secondary" style={{ color: "var(--red)" }} onClick={() => setSupprimer(true)}><Trash2 size={17} />Supprimer</button>
      </div>
    </Modal>
  );
}

function partagerContact(e: Eleve) {
  const texte = `Contact élève :\n${e.prenom} ${e.nom}\nClasse : ${e.classe}\nTél : ${e.telephone}${e.telephoneParent ? `\nParent : ${e.nomParent ?? ""} ${e.telephoneParent}` : ""}`;
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
    nomParent: eleve?.nomParent ?? "",
    telephoneParent: eleve?.telephoneParent ?? "",
  });
  const [contact, setContact] = useState<NonNullable<Eleve["contactMessages"]>>(eleve?.contactMessages ?? (eleve?.telephoneParent ? "parent" : "eleve"));
  const [remise, setRemise] = useState(String(eleve?.remise ?? ""));
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  // Au moins un numéro (élève ou parent) pour pouvoir le contacter
  const groupeChoisi = groupes.find((g) => g.nom.trim().toLowerCase() === f.groupe.trim().toLowerCase());
  const d = useDonnees();
  const changeDeGroupe = !eleve || eleve.groupe.trim().toLowerCase() !== f.groupe.trim().toLowerCase();
  const complet = !!groupeChoisi && changeDeGroupe && placesDuGroupe(d, groupeChoisi).complet;
  const valide = [f.nom, f.prenom, f.groupe].every((v) => v.trim()) && !!(f.telephone.trim() || f.telephoneParent.trim()) && !complet;

  const enregistrer = () => {
    if (!valide) return;
    const propre = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as typeof f;
    const r = Math.min(100, Math.max(0, parseFloat(remise.replace(",", ".")) || 0));
    const complet = { ...propre, contactMessages: contact, remise: r || undefined };
    if (eleve) actions.modifierEleve({ ...eleve, ...complet });
    else actions.ajouterEleve(complet);
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
        <Field label="Téléphone de l'élève"><input className="input" type="tel" inputMode="tel" value={f.telephone} onChange={set("telephone")} /></Field>
        <Field label="Classe"><input className="input" placeholder="ex. Bac Math, 3ème" value={f.classe} onChange={set("classe")} /></Field>
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
      <div className="fields-2">
        <Field label="Nom du parent"><input className="input" value={f.nomParent} onChange={set("nomParent")} placeholder="ex. Mme Ben Ali" /></Field>
        <Field label="Téléphone du parent"><input className="input" type="tel" inputMode="tel" value={f.telephoneParent} onChange={set("telephoneParent")} /></Field>
      </div>
      <Field label="Envoyer les messages (rappels, reçus, annulations) à">
        <div className="chips">
          {([["eleve", "L'élève"], ["parent", "Le parent"], ["les_deux", "Les deux"]] as const).map(([v, l]) => (
            <button key={v} type="button" className={`chip ${contact === v ? "on" : ""}`} onClick={() => setContact(v)}>{l}</button>
          ))}
        </div>
      </Field>
      {complet && <div className="alert red small"><div>Le groupe <b>{groupeChoisi!.nom}</b> est complet ({groupeChoisi!.capacite} élèves). Choisissez un autre groupe, ou ajoutez l'élève en liste d'attente depuis la page du groupe.</div></div>}
      {!f.telephone.trim() && !f.telephoneParent.trim() && <div className="tiny" style={{ color: "var(--red)" }}>Indiquez au moins un numéro (élève ou parent).</div>}
      <Field label="Réduction sur le tarif (%) — ex. frères et sœurs"><input className="input" inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} placeholder="0" /></Field>
      <Field label="Anniversaire (jj/mm)"><input className="input" value={f.anniversaire} onChange={set("anniversaire")} placeholder="Facultatif" /></Field>
      <Field label="Observation"><textarea className="input" value={f.observation} onChange={set("observation")} /></Field>
    </Modal>
  );
}

/** Espace parents : lien privé en lecture seule (nécessite la synchronisation en ligne). */
function LienParent({ eleve: e }: { eleve: Eleve }) {
  const sync = useSync();
  const connecte = !!sync.email && sync.statut !== "deconnecte" && sync.statut !== "non_configure";
  const lien = e.lienParent ? `${window.location.origin}/#parent=${e.lienParent}${parametreServeurPourLien()}` : "";
  const dest = destinataires(e).find((x) => x.libelle !== "Élève") ?? destinataires(e)[0];
  const texte = `Bonjour, voici votre espace pour suivre ${e.prenom} (présences, devoirs, notes, paiements) : ${lien}`;
  return (
    <div className="card pad stack" style={{ gap: 6, boxShadow: "none" }}>
      <div className="row bold small"><Users size={16} />Espace parents</div>
      {!connecte ? (
        <div className="tiny muted">Activez la synchronisation en ligne (Paramètres) pour créer un lien de suivi à envoyer aux parents.</div>
      ) : !e.lienParent ? (
        <>
          <div className="tiny muted">Un lien privé permet au parent de consulter présences, devoirs, notes et paiements de {e.prenom} (sans pouvoir rien modifier).</div>
          <button className="btn secondary small" onClick={() => { actions.definirLienParent(e.id, nouveauJeton()); toast("Lien créé"); }}>Créer le lien</button>
        </>
      ) : (
        <>
          <div className="tiny muted ellipsis">{lien}</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {dest && <a className="btn success small" href={lienWhatsapp(dest.telephone, texte)} target="_blank" rel="noreferrer"><MessageCircle size={15} />Envoyer ({dest.libelle})</a>}
            <button className="btn secondary small" onClick={() => navigator.clipboard.writeText(lien).then(() => toast("Lien copié"), () => toast(lien))}>Copier</button>
            <a className="btn ghost small" href={lien} target="_blank" rel="noreferrer">Voir</a>
            <button className="btn ghost small" style={{ color: "var(--red)" }} onClick={() => { actions.definirLienParent(e.id, undefined); toast("Lien désactivé"); }}>Désactiver</button>
          </div>
          <div className="tiny muted">Mis à jour automatiquement à chaque synchronisation.</div>
        </>
      )}
    </div>
  );
}
