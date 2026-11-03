import { useMemo, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { heureProchainCours, useDonnees } from "../store";
import { Field, Modal, toast } from "../components";
import { lienWhatsapp, numeroInternational, remplirModele } from "../utils";

/**
 * Message WhatsApp à plusieurs élèves.
 * WhatsApp ne permet pas de créer un groupe ni d'envoyer à plusieurs numéros depuis un lien :
 * on prépare donc le message, puis on l'envoie à chaque élève en un clic (WhatsApp s'ouvre à chaque fois).
 */
export default function MessageWhatsApp({ groupeInitial, messageInitial, onClose }: { groupeInitial?: string; messageInitial?: string; onClose: () => void }) {
  const d = useDonnees();
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const [groupe, setGroupe] = useState<string | null>(groupeInitial ?? d.groupes[0]?.nom ?? null);
  const eleves = useMemo(
    () => d.eleves
      .filter((e) => groupe === null || memeNom(e.groupe, groupe))
      .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr")),
    [d.eleves, groupe]
  );
  const [exclus, setExclus] = useState<string[]>([]);
  const [message, setMessage] = useState(messageInitial ?? d.reglages.smsTemplateRappel);
  const [etape, setEtape] = useState<1 | 2>(1);
  const [envoyes, setEnvoyes] = useState<string[]>([]);

  const choisis = eleves.filter((e) => !exclus.includes(e.id) && e.telephone.trim());
  const sansTel = eleves.filter((e) => !e.telephone.trim());
  const texte = (e: (typeof eleves)[number]) =>
    remplirModele(message, { prenom: e.prenom, nom: e.nom, classe: e.classe, heure: heureProchainCours(d, e) });

  if (etape === 2) {
    return (
      <Modal titre={`Envoyer le message (${envoyes.length}/${choisis.length})`} onClose={onClose}
        footer={<button className="btn" onClick={onClose}>Terminer</button>}>
        <div className="small muted">Touchez « Envoyer » pour chaque élève : WhatsApp s'ouvre avec le message prêt, il suffit d'appuyer sur Envoyer puis de revenir ici.</div>
        <div className="list" style={{ gap: 4 }}>
          {choisis.map((e) => {
            const fait = envoyes.includes(e.id);
            return (
              <div key={e.id} className="item" style={{ padding: "6px 0" }}>
                <div className="grow">
                  <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                  <div className="tiny muted">+{numeroInternational(e.telephone)}</div>
                </div>
                <a className={`btn small ${fait ? "secondary" : "success"}`} href={lienWhatsapp(e.telephone, texte(e))} target="_blank" rel="noreferrer"
                  onClick={() => setEnvoyes((l) => (l.includes(e.id) ? l : [...l, e.id]))}>
                  {fait ? <><Check size={15} />Envoyé</> : <><MessageCircle size={15} />Envoyer</>}
                </a>
              </div>
            );
          })}
        </div>
      </Modal>
    );
  }

  return (
    <Modal titre="Message WhatsApp groupé" onClose={onClose}
      footer={<>
        <button className="btn secondary" onClick={() => {
          const nums = choisis.map((e) => "+" + numeroInternational(e.telephone)).join(", ");
          navigator.clipboard.writeText(nums).then(() => toast(`${choisis.length} numéro(s) copié(s)`), () => toast(nums));
        }} disabled={!choisis.length}><Copy size={16} />Copier les numéros</button>
        <button className="btn" disabled={!choisis.length || !message.trim()} onClick={() => setEtape(2)}>Suivant ({choisis.length})</button>
      </>}>
      <Field label="1. Groupe">
        <div className="chips">
          {d.groupes.map((g) => <button key={g.id} className={`chip ${groupe === g.nom ? "on" : ""}`} onClick={() => { setGroupe(g.nom); setExclus([]); }}>{g.nom}</button>)}
        </div>
      </Field>
      <div className="list" style={{ gap: 0, maxHeight: 220, overflowY: "auto" }}>
        {eleves.map((e) => (
          <label key={e.id} className="ligne-choix" style={!e.telephone.trim() ? { opacity: 0.5 } : undefined}>
            <input type="checkbox" disabled={!e.telephone.trim()} checked={!exclus.includes(e.id) && !!e.telephone.trim()}
              onChange={() => setExclus(exclus.includes(e.id) ? exclus.filter((x) => x !== e.id) : [...exclus, e.id])} />
            <span className="grow">{e.prenom} {e.nom}</span>
            <span className="tiny muted">{e.telephone || "pas de numéro"}</span>
          </label>
        ))}
        {eleves.length === 0 && <div className="small muted">Aucun élève.</div>}
      </div>
      {sansTel.length > 0 && <div className="tiny muted">{sansTel.length} élève(s) sans numéro de téléphone.</div>}
      <Field label="Message">
        <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <div className="tiny muted">Mots-clés remplacés pour chaque élève : {"{prenom} {nom} {classe} {heure}"}</div>
    </Modal>
  );
}
