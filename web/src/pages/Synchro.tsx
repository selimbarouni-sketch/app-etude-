import { useEffect, useState } from "react";
import { Cloud, CloudOff, History, LogOut, RefreshCw } from "lucide-react";
import { DemandeCode, Field, Modal, toast } from "../components";
import {
  choisirDonnees, configParEnvironnement, enregistrerConfig, lireConfig, listerSauvegardes, reinitialiser,
  restaurerSauvegarde, seConnecter, seDeconnecter, synchroniser, useSync, type Sauvegarde,
} from "../sync";

const LIBELLES = {
  non_configure: "Non configurée",
  deconnecte: "Non connectée",
  en_cours: "Synchronisation…",
  a_jour: "À jour",
  hors_ligne: "Hors connexion",
  erreur: "Erreur",
} as const;

/** Petit indicateur d'état (en-tête). */
export function IndicateurSync({ onClick }: { onClick?: () => void }) {
  const s = useSync();
  if (s.statut === "non_configure") return null;
  const couleur = s.statut === "a_jour" ? "var(--green)" : s.statut === "erreur" ? "var(--red)" : s.statut === "en_cours" ? "var(--primary)" : "var(--muted)";
  const Icone = s.statut === "hors_ligne" || s.statut === "deconnecte" || s.statut === "erreur" ? CloudOff : s.statut === "en_cours" ? RefreshCw : Cloud;
  return (
    <button className="icon-btn" title={`Synchronisation : ${LIBELLES[s.statut]}`} aria-label={`Synchronisation : ${LIBELLES[s.statut]}`} onClick={onClick} style={{ color: couleur }}>
      <Icone size={19} className={s.statut === "en_cours" ? "tourne" : undefined} />
    </button>
  );
}

const depuis = (t: number | null) => {
  if (!t) return "jamais";
  const min = Math.round((Date.now() - t) / 60000);
  return min < 1 ? "à l'instant" : min < 60 ? `il y a ${min} min` : new Date(t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

/** Section « Synchronisation en ligne » des paramètres. */
export default function SectionSynchro() {
  const s = useSync();
  const [url, setUrl] = useState(lireConfig()?.url ?? "");
  const [cle, setCle] = useState(lireConfig()?.cle ?? "");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [msg, setMsg] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [choix, setChoix] = useState(false);
  const [sauvegardes, setSauvegardes] = useState<Sauvegarde[] | null>(null);
  const [aRestaurer, setARestaurer] = useState<Sauvegarde | null>(null);
  const [config, setConfig] = useState(false);

  useEffect(() => { synchroniser(); }, []);

  const connecter = async (creer: boolean) => {
    setOccupe(true); setMsg(null);
    const r = await seConnecter(email, mdp, creer);
    setOccupe(false);
    if (r.erreur) setMsg({ texte: r.erreur, erreur: true });
    else if (r.info) setMsg({ texte: r.info, erreur: false });
    else if (r.choix) setChoix(true);
    else { setMdp(""); toast("Connecté : vos données sont synchronisées"); }
  };

  const formulaireConfig = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="small muted">
        Créez un projet gratuit sur <b>supabase.com</b>, exécutez le script <code>web/supabase/schema.sql</code>, puis
        collez ici l'adresse du projet et la clé publique (<i>Project Settings → API</i>). Le guide pas à pas est dans <code>SYNCHRONISATION.md</code>.
      </div>
      <Field label="Adresse du projet (Project URL)"><input className="input" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
      <Field label="Clé publique (anon public key)"><input className="input" placeholder="eyJhbGciOi…" value={cle} onChange={(e) => setCle(e.target.value)} /></Field>
      <button className="btn" disabled={!url.trim() || !cle.trim()} onClick={() => { enregistrerConfig({ url, cle }); setConfig(false); reinitialiser(); toast("Serveur enregistré"); }}>Enregistrer</button>
    </div>
  );

  return (
    <section className="card pad stack">
      <div className="row">
        <Cloud size={18} />
        <div className="grow">
          <div className="bold">Synchronisation en ligne</div>
          <div className="tiny muted">Mêmes données sur le téléphone et l'ordinateur + sauvegarde automatique chaque jour</div>
        </div>
        <span className={`badge ${s.statut === "a_jour" ? "green" : s.statut === "erreur" ? "red" : s.statut === "en_cours" ? "blue" : ""}`}>{LIBELLES[s.statut]}</span>
      </div>

      {s.statut === "non_configure" || config ? formulaireConfig
        : !s.email || s.statut === "deconnecte" ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="small muted">Connectez-vous avec le même compte sur tous vos appareils.</div>
            <Field label="E-mail"><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Mot de passe (6 caractères minimum)"><input className="input" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} /></Field>
            <div className="fields-2">
              <button className="btn" disabled={occupe || !email || mdp.length < 6} onClick={() => connecter(false)}>Se connecter</button>
              <button className="btn secondary" disabled={occupe || !email || mdp.length < 6} onClick={() => connecter(true)}>Créer le compte</button>
            </div>
            {!configParEnvironnement() && <button className="btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => setConfig(true)}>Changer de serveur</button>}
          </div>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <div className="small">Connecté : <b>{s.email}</b> · dernière synchronisation {depuis(s.derniereSync)}</div>
            {s.erreur && <div className="small" style={{ color: "var(--red)" }}>{s.erreur}</div>}
            <div className="fields-2">
              <button className="btn secondary" onClick={() => synchroniser()}><RefreshCw size={17} />Synchroniser</button>
              <button className="btn secondary" onClick={async () => { try { setSauvegardes(await listerSauvegardes()); } catch (e) { toast((e as Error).message); } }}><History size={17} />Sauvegardes</button>
            </div>
            <button className="btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => seDeconnecter()}><LogOut size={15} />Se déconnecter</button>
          </div>
        )}
      {msg && <div className="small" style={{ color: msg.erreur ? "var(--red)" : "var(--green)" }}>{msg.texte}</div>}

      {choix && (
        <Modal titre="Quelles données garder ?" onClose={() => setChoix(false)}>
          <div className="small">Cet appareil contient déjà des données, et votre compte en ligne aussi. Choisissez celles à garder (les autres seront conservées dans les sauvegardes en ligne).</div>
          <button className="btn" onClick={async () => { await choisirDonnees("compte"); setChoix(false); toast("Données du compte récupérées"); }}>Garder les données du compte (recommandé)</button>
          <button className="btn secondary" onClick={async () => { await choisirDonnees("appareil"); setChoix(false); toast("Données de cet appareil envoyées"); }}>Garder les données de cet appareil</button>
        </Modal>
      )}

      {sauvegardes && (
        <Modal titre="Sauvegardes en ligne" onClose={() => setSauvegardes(null)}>
          <div className="small muted">Une sauvegarde est faite automatiquement chaque jour (30 dernières conservées).</div>
          {sauvegardes.length === 0 && <div className="small">Aucune sauvegarde pour l'instant.</div>}
          {sauvegardes.map((x) => (
            <div key={x.id} className="item" style={{ padding: "6px 0" }}>
              <div className="grow">
                <div className="bold small">{new Date(x.cree_le).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</div>
                <div className="tiny muted">{x.motif}</div>
              </div>
              <button className="btn secondary small" onClick={() => setARestaurer(x)}>Restaurer</button>
            </div>
          ))}
        </Modal>
      )}
      {aRestaurer && (
        <DemandeCode
          titre="Restaurer cette sauvegarde ?"
          message="Toutes les données actuelles seront remplacées par celles de la sauvegarde (les données actuelles sont d'abord sauvegardées)."
          libelle="Restaurer"
          onValide={async () => { await restaurerSauvegarde(aRestaurer.id); setSauvegardes(null); toast("Sauvegarde restaurée"); }}
          onClose={() => setARestaurer(null)}
        />
      )}
    </section>
  );
}
