import { useState } from "react";
import { CheckCircle2, MessageCircle, Plus, Trash2, Wallet } from "lucide-react";
import { actions, elevesPaiementEnAttente, useDonnees } from "../store";
import type { Eleve, Paiement } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { MODES_PAIEMENT, formatDate, formatMontant, lienWhatsapp, lireNombre, remplirModele } from "../utils";

export default function Paiements() {
  const d = useDonnees();
  const { devise, seancesParPaiement: limite, tarifForfait } = d.reglages;
  const [onglet, setOnglet] = useState<"attente" | "historique">("attente");
  const [payer, setPayer] = useState<Eleve | null>(null);
  const [choisir, setChoisir] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Paiement | null>(null);

  const enAttente = elevesPaiementEnAttente(d);
  const totalEncaisse = d.paiements.reduce((s, p) => s + p.montant, 0);
  const totalAttendu = enAttente.reduce((s, e) => s + Math.floor(e.sessionsInCurrentCycle / limite) * tarifForfait, 0);
  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const ceMois = d.paiements.filter((p) => p.date >= debutMois.getTime()).reduce((s, p) => s + p.montant, 0);

  return (
    <>
      <div className="topbar">
        <h1>Paiements</h1>
        <button className="btn secondary" onClick={() => setChoisir(true)} disabled={!d.eleves.length}><Plus size={18} />Encaisser</button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16 }}>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Encaissé ce mois</div><div className="value money" style={{ color: "var(--green)" }}>{formatMontant(ceMois)} <span className="small">{devise}</span></div></div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Encaissé au total</div><div className="value money">{formatMontant(totalEncaisse)} <span className="small">{devise}</span></div></div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Somme attendue</div><div className="value money" style={{ color: totalAttendu ? "var(--red)" : "var(--green)" }}>{formatMontant(totalAttendu)} <span className="small">{devise}</span></div></div>
      </div>

      <div className="tabs">
        <button className={onglet === "attente" ? "on" : ""} onClick={() => setOnglet("attente")}>À encaisser ({enAttente.length})</button>
        <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({d.paiements.length})</button>
      </div>

      {onglet === "attente" ? (
        enAttente.length === 0 ? (
          <div className="alert green"><CheckCircle2 size={22} /><div className="bold">Tous les paiements sont à jour !</div></div>
        ) : (
          <div className="list">
            {enAttente.map((e) => {
              const nbForfaits = Math.floor(e.sessionsInCurrentCycle / limite);
              const msg = remplirModele(d.reglages.smsTemplatePaiement, { prenom: e.prenom, nom: e.nom, classe: e.classe, montant: formatMontant(tarifForfait * nbForfaits), devise });
              return (
                <div key={e.id} className="card item" style={{ borderColor: "color-mix(in srgb, var(--red) 35%, var(--border))" }}>
                  <div className="grow">
                    <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                    <div className="small muted">{e.classe} · {e.sessionsInCurrentCycle} séances / {limite}</div>
                    <div className="small bold" style={{ color: "var(--red)" }}>
                      À régler : {formatMontant(tarifForfait * nbForfaits)} {devise}{nbForfaits > 1 && ` (${nbForfaits} forfaits)`}
                    </div>
                  </div>
                  <a className="icon-btn" href={lienWhatsapp(e.telephone, msg)} target="_blank" rel="noreferrer" title="Envoyer un rappel WhatsApp" style={{ color: "var(--green)" }}><MessageCircle size={19} /></a>
                  <button className="btn success small" onClick={() => setPayer(e)}><Wallet size={16} />Reçu</button>
                </div>
              );
            })}
          </div>
        )
      ) : d.paiements.length === 0 ? (
        <Vide icone={<Wallet size={48} />} texte="Aucun paiement enregistré." />
      ) : (
        <div className="list">
          {[...d.paiements].sort((a, b) => b.date - a.date).map((p) => (
            <div key={p.id} className="card item">
              <div className="grow">
                <div className="bold ellipsis">{p.nomEleve}</div>
                <div className="small muted">{formatDate(p.date)} · {p.modePaiement} · {p.nbSeancesReglees} séance(s)</div>
                {p.observation && <div className="tiny muted">{p.observation}</div>}
              </div>
              <span className="money" style={{ color: "var(--green)" }}>+{formatMontant(p.montant)} {devise}</span>
              <button className="icon-btn" aria-label="Annuler ce paiement" onClick={() => setASupprimer(p)}><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      )}

      {choisir && (
        <Modal titre="Encaisser un paiement" onClose={() => setChoisir(false)}>
          <div className="small muted">Choisissez l'élève (y compris pour un paiement à l'avance) :</div>
          <div className="list">
            {[...d.eleves].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr")).map((e) => (
              <button key={e.id} className="card item clickable" style={{ textAlign: "left", width: "100%" }} onClick={() => { setChoisir(false); setPayer(e); }}>
                <div className="grow"><div className="bold">{e.prenom} {e.nom}</div><div className="small muted">{e.classe}</div></div>
                <span className="badge blue">{e.sessionsInCurrentCycle}/{limite}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {payer && <FormPaiement eleve={payer} onClose={() => setPayer(null)} />}
      {aSupprimer && (
        <Confirmation
          titre="Annuler ce paiement ?"
          message={`${aSupprimer.nomEleve} — ${formatMontant(aSupprimer.montant)} ${devise} du ${formatDate(aSupprimer.date)}. Les ${aSupprimer.nbSeancesReglees} séances redeviendront à payer.`}
          libelle="Annuler le paiement"
          onConfirm={() => actions.supprimerPaiement(aSupprimer.id)}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}

function FormPaiement({ eleve, onClose }: { eleve: Eleve; onClose: () => void }) {
  const d = useDonnees();
  const { seancesParPaiement, tarifForfait, devise } = d.reglages;
  const [montant, setMontant] = useState(String(tarifForfait));
  const [nb, setNb] = useState(String(seancesParPaiement));
  const [mode, setMode] = useState(MODES_PAIEMENT[0]);
  const [obs, setObs] = useState("");
  const nbSeances = Math.max(0, Math.round(lireNombre(nb, seancesParPaiement)));
  const reste = Math.max(0, eleve.sessionsInCurrentCycle - nbSeances);

  return (
    <Modal
      titre={`Paiement — ${eleve.prenom} ${eleve.nom}`}
      onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn success" onClick={() => {
          actions.enregistrerPaiement({ eleve, montant: lireNombre(montant, tarifForfait), modePaiement: mode, nbSeances, observation: obs.trim() });
          toast("Paiement enregistré");
          onClose();
        }}>Valider le paiement</button></>}
    >
      <div className="alert blue small">
        Séances effectuées : <b>{eleve.sessionsInCurrentCycle}</b>. Après ce paiement, il restera <b>{reste}</b> séance(s) à payer.
      </div>
      <div className="fields-2">
        <Field label={`Montant (${devise})`}><input className="input" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
        <Field label="Séances réglées"><input className="input" inputMode="numeric" value={nb} onChange={(e) => setNb(e.target.value)} /></Field>
      </div>
      <Field label="Mode de paiement">
        <div className="chips">{MODES_PAIEMENT.map((m) => <button key={m} type="button" className={`chip ${mode === m ? "on" : ""}`} onClick={() => setMode(m)}>{m}</button>)}</div>
      </Field>
      <Field label="Observation"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Facultatif" /></Field>
    </Modal>
  );
}
