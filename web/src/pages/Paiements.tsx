import { useState } from "react";
import { CheckCircle2, Hourglass, MessageCircle, Pencil, Plus, Wallet } from "lucide-react";
import { actions, elevesPaiementEnAttente, useDonnees } from "../store";
import type { Eleve, Paiement } from "../types";
import { Confirmation, Field, Modal, Vide, toast } from "../components";
import { MODES_PAIEMENT, formatDate, formatMontant, libelleCycle, lienWhatsapp, lireNombre, remplirModele } from "../utils";

export default function Paiements() {
  const d = useDonnees();
  const { devise, seancesParPaiement: limite, tarifForfait } = d.reglages;
  const [onglet, setOnglet] = useState<"attente" | "historique">("attente");
  const [payer, setPayer] = useState<Eleve | null>(null);
  const [choisir, setChoisir] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Paiement | null>(null);
  const [aModifier, setAModifier] = useState<Paiement | null>(null);

  const enAttente = elevesPaiementEnAttente(d);
  const estEncaisse = (p: Paiement) => p.encaisse !== false;
  const totalEncaisse = d.paiements.filter(estEncaisse).reduce((s, p) => s + p.montant, 0);
  const totalNonEncaisse = d.paiements.filter((p) => !estEncaisse(p)).reduce((s, p) => s + p.montant, 0);
  const totalAttendu = enAttente.reduce((s, e) => s + Math.floor(e.sessionsInCurrentCycle / limite) * tarifForfait, 0);
  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const ceMois = d.paiements.filter((p) => estEncaisse(p) && p.date >= debutMois.getTime()).reduce((s, p) => s + p.montant, 0);

  return (
    <>
      <div className="topbar">
        <h1>Paiements</h1>
        <button className="btn secondary" onClick={() => setChoisir(true)} disabled={!d.eleves.length}><Plus size={18} />Encaisser</button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16 }}>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Encaissé ce mois</div><div className="value money" style={{ color: "var(--green)" }}>{formatMontant(ceMois)} <span className="small">{devise}</span></div></div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Encaissé au total</div><div className="value money">{formatMontant(totalEncaisse)} <span className="small">{devise}</span></div></div>
        {totalNonEncaisse > 0 && <div className="card stat" style={{ cursor: "default" }}><div className="label">Pas encore encaissé</div><div className="value money" style={{ color: "var(--orange)" }}>{formatMontant(totalNonEncaisse)} <span className="small">{devise}</span></div></div>}
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
            <div key={p.id} className="card item clickable" onClick={() => setAModifier(p)}>
              <div className="grow">
                <div className="bold ellipsis">{p.nomEleve}</div>
                <div className="small muted">{formatDate(p.date)} · {p.modePaiement} · {p.nbSeancesReglees} séance(s)</div>
                {p.observation && <div className="tiny muted">{p.observation}</div>}
                {!estEncaisse(p) && (
                  <button className="badge orange" style={{ border: 0, cursor: "pointer", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={(ev) => { ev.stopPropagation(); actions.modifierPaiement({ ...p, encaisse: true }); toast("Marqué comme encaissé"); }}>
                    <Hourglass size={12} />Non encaissé · marquer encaissé
                  </button>
                )}
              </div>
              <span className="money" style={{ color: estEncaisse(p) ? "var(--green)" : "var(--orange)" }}>+{formatMontant(p.montant)} {devise}</span>
              <Pencil size={15} className="muted" />
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
                <span className="badge blue">{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {payer && <FormPaiement eleve={payer} onClose={() => setPayer(null)} />}
      {aModifier && (
        <FormPaiement
          eleve={d.eleves.find((e) => e.id === aModifier.eleveId) ?? null}
          paiement={aModifier}
          onSupprimer={() => { setASupprimer(aModifier); setAModifier(null); }}
          onClose={() => setAModifier(null)}
        />
      )}
      {aSupprimer && (
        <Confirmation
          titre="Annuler ce versement ?"
          message={`${aSupprimer.nomEleve} — ${formatMontant(aSupprimer.montant)} ${devise} du ${formatDate(aSupprimer.date)}. Les ${aSupprimer.nbSeancesReglees} séances redeviendront à payer.`}
          libelle="Annuler le paiement"
          onConfirm={() => actions.supprimerPaiement(aSupprimer.id)}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}

/** Nouveau versement, ou modification d'un versement existant. */
function FormPaiement({ eleve, paiement, onClose, onSupprimer }: { eleve: Eleve | null; paiement?: Paiement; onClose: () => void; onSupprimer?: () => void }) {
  const d = useDonnees();
  const { seancesParPaiement, tarifForfait, devise } = d.reglages;
  const prixSeance = tarifForfait / Math.max(1, seancesParPaiement);
  const [nb, setNb] = useState(paiement?.nbSeancesReglees ?? seancesParPaiement);
  const [montant, setMontant] = useState(String(paiement?.montant ?? tarifForfait));
  const [montantModifie, setMontantModifie] = useState(!!paiement);
  const [mode, setMode] = useState(paiement?.modePaiement ?? MODES_PAIEMENT[0]);
  const [obs, setObs] = useState(paiement?.observation ?? "");
  const [encaisse, setEncaisse] = useState(paiement ? paiement.encaisse !== false : true);

  // Séances faites non payées avant ce versement
  const dues = (eleve?.sessionsInCurrentCycle ?? 0) + (paiement?.nbSeancesReglees ?? 0);
  const reste = dues - nb;
  const changerNb = (n: number) => {
    const v = Math.min(99, Math.max(1, Math.round(n)));
    setNb(v);
    if (!montantModifie) setMontant(String(Math.round(prixSeance * v * 100) / 100));
  };
  const nom = paiement?.nomEleve ?? `${eleve?.prenom} ${eleve?.nom}`;

  return (
    <Modal
      titre={paiement ? `Modifier le versement — ${nom}` : `Paiement — ${nom}`}
      onClose={onClose}
      footer={<>
        {onSupprimer && <button className="btn ghost" style={{ color: "var(--red)", marginRight: "auto" }} onClick={onSupprimer}>Annuler le versement</button>}
        <button className="btn secondary" onClick={onClose}>Fermer</button>
        <button className="btn success" onClick={() => {
          const m = lireNombre(montant, prixSeance * nb);
          if (paiement) {
            actions.modifierPaiement({ ...paiement, montant: m, modePaiement: mode, nbSeancesReglees: nb, observation: obs.trim(), encaisse });
            toast("Versement modifié");
          } else if (eleve) {
            actions.enregistrerPaiement({ eleve, montant: m, modePaiement: mode, nbSeances: nb, observation: obs.trim(), encaisse });
            toast("Paiement enregistré");
          }
          onClose();
        }}>{paiement ? "Enregistrer" : "Valider le paiement"}</button>
      </>}
    >
      <Field label="Nombre de séances payées">
        <div className="row wrap">
          <button className="btn secondary" type="button" onClick={() => changerNb(nb - 1)} aria-label="Moins">−</button>
          <input className="input" style={{ width: 70, textAlign: "center", fontWeight: 700 }} inputMode="numeric" value={nb}
            onChange={(e) => changerNb(lireNombre(e.target.value, nb))} />
          <button className="btn secondary" type="button" onClick={() => changerNb(nb + 1)} aria-label="Plus">+</button>
          {[seancesParPaiement, seancesParPaiement * 2].map((n) => (
            <button key={n} type="button" className={`chip ${nb === n ? "on" : ""}`} onClick={() => changerNb(n)}>{n} séances</button>
          ))}
        </div>
      </Field>
      <div className="alert blue small"><div>
        {reste > 0 && <>Séances faites non payées : <b>{dues}</b> → il en restera <b>{reste}</b> à payer.</>}
        {reste === 0 && <>Séances faites non payées : <b>{dues}</b> → tout sera réglé.</>}
        {reste < 0 && <>Séances faites non payées : <b>{Math.max(0, dues)}</b> → crédit de <b>{-reste}</b> séance(s) payée(s) d'avance.</>}
      </div></div>
      <Field label={`Montant (${devise}) — ${formatMontant(prixSeance)} ${devise} par séance`}>
        <input className="input" inputMode="decimal" value={montant} onChange={(e) => { setMontant(e.target.value); setMontantModifie(true); }} />
      </Field>
      <Field label="Mode de paiement">
        <div className="chips">{MODES_PAIEMENT.map((m) => <button key={m} type="button" className={`chip ${mode === m ? "on" : ""}`} onClick={() => setMode(m)}>{m}</button>)}</div>
      </Field>
      <label className="row card pad" style={{ cursor: "pointer", boxShadow: "none" }}>
        <input type="checkbox" checked={encaisse} onChange={(e) => setEncaisse(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span className="grow">
          <span className="bold">Encaissé</span>
          <span className="tiny muted" style={{ display: "block" }}>{encaisse ? "L'argent est reçu" : "Prévu, pas encore reçu (ex. chèque à déposer)"}</span>
        </span>
      </label>
      <Field label="Observation"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Facultatif" /></Field>
    </Modal>
  );
}
