import { useRef, useState } from "react";
import { Bell, Download, FileText, KeyRound, Lock, MessageCircle, Moon, Save, Sheet, Upload } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Style, Theme } from "../types";
import { Confirmation, Field, Modal, toast } from "../components";
import { CONFIG } from "../config";
import MessageWhatsApp from "./MessageWhatsApp";
import SectionSynchro from "./Synchro";
import SectionVacances from "./Vacances";
import { BoutonInstaller, estInstallee } from "../installation";
import { activerCode, changerCode, codeActif, codeParDefaut, codeValide, verifierCode } from "../securite";
import { formatDate, formatDuree, formatMontant, lireNombre, telecharger, versCsv } from "../utils";

export default function Parametres() {
  const d = useDonnees();
  const r = d.reglages;
  const [tarif, setTarif] = useState({ seances: String(r.seancesParPaiement), forfait: String(r.tarifForfait), duree: String(r.dureeParDefautHeures), devise: r.devise });
  const [modeles, setModeles] = useState({ rappel: r.smsTemplateRappel, paiement: r.smsTemplatePaiement });
  const [relance, setRelance] = useState(String(r.relanceJours));
  const [absenceModele, setAbsenceModele] = useState(r.smsTemplateAbsence);
  const [pdf, setPdf] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [importer, setImporter] = useState<string | null>(null);
  const [effacer, setEffacer] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  const jour = new Date().toISOString().slice(0, 10);
  const STATUT: Record<string, string> = { P: "Présent", A: "Absent", R: "Retard", J: "Absence justifiée" };

  return (
    <>
      <div className="topbar"><h1>Paramètres & outils</h1></div>
      <div className="stack">
        <SectionSynchro />
        <SectionVacances />
        <section className="card pad stack">
          <div className="row bold"><Moon size={18} />Apparence</div>
          <div className="small muted">Style</div>
          <div className="fields-2">
            {([["classique", "Classique", "Bleu, moderne et coloré"], ["chic", "Chic", "Ivoire, bleu nuit et or, élégant"]] as [Style, string, string][]).map(([v, l, desc]) => (
              <button key={v} className={`card apercu-style ${r.style === v ? "on" : ""}`} data-apercu={v} onClick={() => actions.enregistrerReglages({ style: v })}>
                <span className="apercu-couleurs"><i /><i /><i /></span>
                <span className="bold">{l}</span>
                <span className="tiny muted">{desc}</span>
              </button>
            ))}
          </div>
          <div className="small muted">Luminosité</div>
          <div className="chips">
            {([["auto", "Automatique"], ["clair", "Clair"], ["sombre", "Sombre"]] as [Theme, string][]).map(([v, l]) => (
              <button key={v} className={`chip ${r.theme === v ? "on" : ""}`} onClick={() => actions.enregistrerReglages({ theme: v })}>{l}</button>
            ))}
          </div>
        </section>

        <section className="card pad stack">
          <div className="bold">Application sur le téléphone</div>
          {estInstallee() ? (
            <div className="small muted">✅ {CONFIG.nomApp} est installée sur cet appareil.</div>
          ) : (
            <>
              <div className="small muted">Ajoutez {CONFIG.nomApp} à l'écran d'accueil de votre smartphone : elle s'ouvrira en plein écran, comme une application.</div>
              <BoutonInstaller className="btn" />
            </>
          )}
        </section>

        <Securite />

        <section className="card pad stack">
          <div className="row bold"><Bell size={18} />Rappels des séances</div>
          <div className="small muted">
            Un rappel s'affiche en haut de l'application 1 h avant le cours de chaque groupe (selon son créneau hebdomadaire). Activez les notifications pour être aussi
            prévenu quand l'onglet est en arrière-plan (l'application doit rester ouverte dans le navigateur).
          </div>
          {"Notification" in window && (
            <button className="btn secondary" disabled={Notification.permission === "granted"} onClick={async () => {
              const r = await Notification.requestPermission();
              toast(r === "granted" ? "Notifications activées" : "Notifications refusées par le navigateur");
            }}>
              <Bell size={18} />{Notification.permission === "granted" ? "Notifications activées" : "Activer les notifications"}
            </button>
          )}
        </section>

        <section className="card pad stack">
          <div className="bold">Cours & forfait</div>
          <div className="tiny muted">Tarif général. Chaque groupe peut avoir son propre tarif par séance (modifier le groupe), et chaque élève une réduction (fiche élève).</div>
          <div className="fields-2">
            <Field label="Séances avant paiement"><input className="input" inputMode="numeric" value={tarif.seances} onChange={(e) => setTarif({ ...tarif, seances: e.target.value })} /></Field>
            <Field label={`Montant du forfait (${tarif.devise || "TND"})`}><input className="input" inputMode="decimal" value={tarif.forfait} onChange={(e) => setTarif({ ...tarif, forfait: e.target.value })} /></Field>
            <Field label="Durée d'un cours (h)"><input className="input" inputMode="decimal" value={tarif.duree} onChange={(e) => setTarif({ ...tarif, duree: e.target.value })} /></Field>
            <Field label="Devise"><input className="input" value={tarif.devise} onChange={(e) => setTarif({ ...tarif, devise: e.target.value })} /></Field>
          </div>
          <button className="btn" onClick={() => {
            actions.enregistrerReglages({
              seancesParPaiement: Math.max(1, Math.round(lireNombre(tarif.seances, 4))),
              tarifForfait: lireNombre(tarif.forfait, 100),
              dureeParDefautHeures: lireNombre(tarif.duree, 2),
              devise: tarif.devise.trim() || CONFIG.deviseParDefaut,
            });
            toast("Réglages enregistrés");
          }}><Save size={18} />Enregistrer</button>
        </section>

        <section className="card pad stack">
          <div className="bold">Modèles de messages</div>
          <Field label="Rappel de cours"><textarea className="input" value={modeles.rappel} onChange={(e) => setModeles({ ...modeles, rappel: e.target.value })} /></Field>
          <div className="tiny muted">Mots-clés : {"{prenom} {nom} {classe} {heure}"}</div>
          <Field label="Rappel de paiement"><textarea className="input" value={modeles.paiement} onChange={(e) => setModeles({ ...modeles, paiement: e.target.value })} /></Field>
          <div className="tiny muted">Mots-clés : {"{prenom} {nom} {classe} {seances} {montant} {devise}"}</div>
          <Field label="Relancer un élève qui n'a pas payé tous les … jours">
            <input className="input" inputMode="numeric" value={relance} onChange={(e) => setRelance(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <button className="btn" onClick={() => { actions.enregistrerReglages({ smsTemplateRappel: modeles.rappel, smsTemplatePaiement: modeles.paiement, relanceJours: Math.max(1, parseInt(relance, 10) || 3) }); toast("Modèles enregistrés"); }}><Save size={18} />Enregistrer les modèles</button>
        </section>

        <section className="card pad stack">
          <div className="bold">Absences</div>
          <label className="row small" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={r.absencesComptees} style={{ width: 18, height: 18 }} onChange={(e) => actions.enregistrerReglages({ absencesComptees: e.target.checked })} />
            <span className="grow">Les absences <b>non justifiées</b> sont dues (comptées comme séances à payer). Les absences justifiées (J) ne sont jamais comptées.</span>
          </label>
          <Field label="Alerte après combien d'absences de suite ?">
            <div className="chips">
              {[2, 3, 4].map((n) => <button key={n} type="button" className={`chip ${r.seuilAbsences === n ? "on" : ""}`} onClick={() => actions.enregistrerReglages({ seuilAbsences: n })}>{n} absences</button>)}
            </div>
          </Field>
          <Field label="Message au parent"><textarea className="input" value={absenceModele} onChange={(e) => setAbsenceModele(e.target.value)} /></Field>
          <div className="tiny muted">Mots-clés : {"{prenom} {nom} {classe} {groupe} {nb}"}</div>
          <button className="btn secondary" onClick={() => { actions.enregistrerReglages({ smsTemplateAbsence: absenceModele }); toast("Message enregistré"); }}><Save size={18} />Enregistrer le message</button>
        </section>

        <section className="card pad stack">
          <div className="bold">Exports & rapports</div>
          <div className="fields-2">
            <button className="btn secondary" onClick={() => setPdf(true)} disabled={!d.eleves.length}><FileText size={18} />Rapport PDF élève</button>
            <button className="btn secondary" onClick={() => setWhatsapp(true)} disabled={!d.eleves.length}><MessageCircle size={18} />Message WhatsApp groupé</button>
            <button className="btn secondary" onClick={() => telecharger(`Eleves_${jour}.csv`, versCsv([
              ["Nom", "Prénom", "Téléphone", "Classe", "Groupe", "Inscription", "Séances cycle", "Total séances", "Observation"],
              ...d.eleves.map((e) => [e.nom, e.prenom, e.telephone, e.classe, e.groupe, formatDate(e.dateInscription), e.sessionsInCurrentCycle, e.totalSeancesRealisees, e.observation]),
            ]), "text/csv;charset=utf-8")}><Sheet size={18} />Élèves (Excel)</button>
            <button className="btn secondary" onClick={() => telecharger(`Seances_${jour}.csv`, versCsv([
              ["Élève", "Groupe", "Date", "Heure", "Durée (h)", "Statut", "Commentaire"],
              ...[...d.seances].sort((a, b) => b.date - a.date).map((s) => [s.nomEleve, s.groupe, formatDate(s.date), s.heure, formatDuree(s.dureeHeures), STATUT[s.statut], s.commentaire]),
            ]), "text/csv;charset=utf-8")}><Sheet size={18} />Séances (Excel)</button>
            <button className="btn secondary" onClick={() => telecharger(`Paiements_${jour}.csv`, versCsv([
              ["Élève", "Date", `Montant (${r.devise})`, "Mode", "Séances réglées", "Observation"],
              ...[...d.paiements].sort((a, b) => b.date - a.date).map((p) => [p.nomEleve, formatDate(p.date), formatMontant(p.montant), p.modePaiement, p.nbSeancesReglees, p.observation]),
            ]), "text/csv;charset=utf-8")}><Sheet size={18} />Paiements (Excel)</button>
          </div>
        </section>

        <section className="card pad stack">
          <div className="bold">Sauvegarde des données</div>
          <div className="small muted">
            Les données sont enregistrées dans ce navigateur, sur cet appareil. Téléchargez régulièrement une sauvegarde
            (et utilisez-la pour transférer vos données vers un autre appareil).
          </div>
          <div className="fields-2">
            <button className="btn" onClick={() => { telecharger(`ProfSuivi_sauvegarde_${jour}.json`, actions.exporterJson(), "application/json"); toast("Sauvegarde téléchargée"); }}><Download size={18} />Télécharger</button>
            <button className="btn secondary" onClick={() => fichier.current?.click()}><Upload size={18} />Restaurer</button>
          </div>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) setImporter(await f.text());
          }} />
          <button className="btn ghost small" style={{ color: "var(--red)", alignSelf: "flex-start" }} onClick={() => setEffacer(true)}>Effacer toutes les données…</button>
        </section>

        <div className="tiny muted" style={{ textAlign: "center" }}>{CONFIG.nomApp} · version web</div>
      </div>

      {pdf && <ChoixEleve titre="Rapport PDF" action="Générer le PDF" onClose={() => setPdf(false)} onChoix={async (ids) => {
        const { rapportEleve } = await import("../pdf");
        ids.forEach((id) => { const e = d.eleves.find((x) => x.id === id); if (e) rapportEleve(d, e); });
      }} unique />}
      {whatsapp && <MessageWhatsApp onClose={() => setWhatsapp(false)} />}
      {importer && (
        <Confirmation titre="Restaurer cette sauvegarde ?" libelle="Restaurer"
          message="Les données actuelles de cet appareil seront remplacées par celles du fichier."
          onConfirm={() => { try { actions.importerJson(importer); toast("Sauvegarde restaurée"); } catch { toast("Fichier invalide"); } }}
          onClose={() => setImporter(null)} />
      )}
      {effacer && (
        <Confirmation titre="Effacer toutes les données ?" libelle="Tout effacer"
          message="Élèves, séances, paiements, rendez-vous et notes seront supprimés de cet appareil. Pensez à télécharger une sauvegarde avant."
          onConfirm={() => { actions.toutEffacer(); toast("Données effacées"); }} onClose={() => setEffacer(false)} />
      )}
    </>
  );
}

/** Choix d'un élève : d'abord le groupe, puis l'élève (jamais de liste mélangée). */
function ChoixEleve({ titre, action, onChoix, onClose }: { titre: string; action: string; unique?: boolean; onChoix: (ids: string[]) => void; onClose: () => void }) {
  const d = useDonnees();
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const groupes = [
    ...d.groupes.map((g) => ({ nom: g.nom, eleves: d.eleves.filter((e) => memeNom(e.groupe, g.nom)) })),
    { nom: "Sans groupe", eleves: d.eleves.filter((e) => !d.groupes.some((g) => memeNom(g.nom, e.groupe))) },
  ].filter((g) => g.eleves.length);
  const [groupe, setGroupe] = useState(groupes[0]?.nom ?? "");
  const [sel, setSel] = useState<string | null>(null);
  const eleves = (groupes.find((g) => g.nom === groupe)?.eleves ?? []).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  return (
    <Modal titre={titre} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!sel} onClick={() => { if (sel) onChoix([sel]); onClose(); }}>{action}</button></>}>
      <Field label="1. Groupe">
        <div className="chips">{groupes.map((g) => <button key={g.nom} type="button" className={`chip ${groupe === g.nom ? "on" : ""}`} onClick={() => { setGroupe(g.nom); setSel(null); }}>{g.nom}</button>)}</div>
      </Field>
      <div className="small bold muted">2. Élève</div>
      {eleves.map((e) => (
        <label key={e.id} className="row" style={{ cursor: "pointer", padding: "4px 0" }}>
          <input type="radio" checked={sel === e.id} onChange={() => setSel(e.id)} />
          <span className="grow">{e.prenom} {e.nom} <span className="muted small">· {e.classe}</span></span>
        </label>
      ))}
    </Modal>
  );
}

function Securite() {
  const [actif, setActif] = useState(codeActif());
  const [changer, setChanger] = useState(false);
  const [desactiver, setDesactiver] = useState(false);
  return (
    <section className="card pad stack">
      <div className="row">
        <Lock size={18} />
        <div className="grow">
          <div className="bold">Code d'accès</div>
          <div className="tiny muted">{!actif ? "Désactivé" : codeParDefaut() ? "Activé · code par défaut 1234" : "Activé · code personnalisé"}</div>
        </div>
        <label className="row small" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={actif} style={{ width: 18, height: 18 }}
            onChange={(e) => { if (e.target.checked) { activerCode(true); setActif(true); toast("Code d'accès activé"); } else setDesactiver(true); }} />
          Activé
        </label>
      </div>
      <div className="fields-2">
        <button className="btn secondary" onClick={() => setChanger(true)}><KeyRound size={18} />Modifier le code</button>
        <button className="btn secondary" disabled={!actif} onClick={() => window.dispatchEvent(new Event("profsuivi:verrouiller"))}><Lock size={18} />Verrouiller</button>
      </div>
      {changer && <ChangerCode onClose={() => setChanger(false)} />}
      {desactiver && <DesactiverCode onClose={(ok) => { setDesactiver(false); if (ok) setActif(false); }} />}
    </section>
  );
}

const champCode = (label: string, v: string, set: (s: string) => void, autoFocus = false) => (
  <Field label={label}>
    <input className="input" type="password" inputMode="numeric" autoComplete="off" value={v} autoFocus={autoFocus}
      onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 8))} />
  </Field>
);

function ChangerCode({ onClose }: { onClose: () => void }) {
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [conf, setConf] = useState("");
  const [erreur, setErreur] = useState("");
  return (
    <Modal titre="Modifier le code d'accès" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={async () => {
          if (!(await verifierCode(actuel))) return setErreur("Le code actuel est incorrect.");
          if (!codeValide(nouveau)) return setErreur("Le nouveau code doit contenir 4 à 8 chiffres.");
          if (nouveau !== conf) return setErreur("La confirmation ne correspond pas.");
          await changerCode(nouveau);
          toast("Code d'accès modifié");
          onClose();
        }}>Enregistrer</button></>}>
      {champCode("Code actuel", actuel, (v) => { setActuel(v); setErreur(""); }, true)}
      {champCode("Nouveau code (4 à 8 chiffres)", nouveau, (v) => { setNouveau(v); setErreur(""); })}
      {champCode("Confirmer le nouveau code", conf, (v) => { setConf(v); setErreur(""); })}
      {erreur && <div className="small" style={{ color: "var(--red)" }}>{erreur}</div>}
    </Modal>
  );
}

function DesactiverCode({ onClose }: { onClose: (ok: boolean) => void }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(false);
  return (
    <Modal titre="Désactiver le code ?" onClose={() => onClose(false)}
      footer={<><button className="btn secondary" onClick={() => onClose(false)}>Annuler</button>
        <button className="btn danger" onClick={async () => {
          if (await verifierCode(code)) { activerCode(false); toast("Code d'accès désactivé"); onClose(true); } else setErreur(true);
        }}>Désactiver</button></>}>
      <div className="small muted">L'application s'ouvrira sans code. Saisissez le code actuel pour confirmer.</div>
      {champCode("Code actuel", code, (v) => { setCode(v); setErreur(false); }, true)}
      {erreur && <div className="small" style={{ color: "var(--red)" }}>Code incorrect.</div>}
    </Modal>
  );
}
