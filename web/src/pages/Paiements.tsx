import { useMemo, useState } from "react";
import { BellRing, Download, FileText, Hourglass, MessageCircle, MessageSquare, Share2, Wallet } from "lucide-react";
import { actions, destinataires, groupeDuPaiement, prixSeance, useDonnees } from "../store";
import type { Eleve, Paiement } from "../types";
import { Confirmation, DemandeCode, Field, Modal, Vide, toast } from "../components";
import { MODES_PAIEMENT, estAujourdhui, formatDate, formatMontant, initiales, libelleCycle, lienSms, lienWhatsapp, lireNombre, remplirModele } from "../utils";

const SANS_GROUPE = "Sans groupe";
const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Paiements, groupe par groupe (les élèves de groupes différents ne sont jamais mélangés) :
 * 1. choisir le groupe ; 2. encaisser / relancer ses élèves ; historique des paiements du groupe.
 */
export default function Paiements() {
  const d = useDonnees();
  const { devise, seancesParPaiement: limite } = d.reglages;
  const prix = (e: Eleve) => prixSeance(d, e);
  const [payer, setPayer] = useState<Eleve | null>(null);
  const [aSupprimer, setASupprimer] = useState<Paiement | null>(null);
  const [aModifier, setAModifier] = useState<Paiement | null>(null);
  // Un versement enregistré est verrouillé : le code d'accès est demandé pour le modifier ou l'annuler
  const [aDeverrouiller, setADeverrouiller] = useState<Paiement | null>(null);
  const [recu, setRecu] = useState<Paiement | null>(null);
  const [onglet, setOnglet] = useState<"encaisser" | "historique">("encaisser");

  const groupes = useMemo(() => {
    const liste = d.groupes.map((g) => ({ nom: g.nom, eleves: d.eleves.filter((e) => memeNom(e.groupe, g.nom)) }));
    const sans = d.eleves.filter((e) => !d.groupes.some((g) => memeNom(g.nom, e.groupe)));
    if (sans.length) liste.push({ nom: SANS_GROUPE, eleves: sans });
    return liste.map((g) => ({ ...g, eleves: [...g.eleves].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr")) }));
  }, [d.groupes, d.eleves]);
  const [choix, setChoix] = useState(() => (groupes.find((g) => g.eleves.some((e) => e.sessionsInCurrentCycle >= limite)) ?? groupes[0])?.nom ?? "");
  const groupe = groupes.find((g) => g.nom === choix) ?? groupes[0];

  const estEncaisse = (p: Paiement) => p.encaisse !== false;
  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
  const paiementsGroupe = groupe
    ? d.paiements.filter((p) => { const g = groupeDuPaiement(d, p); return groupe.nom === SANS_GROUPE ? !d.groupes.some((x) => memeNom(x.nom, g)) : memeNom(g, groupe.nom); })
        .sort((a, b) => b.date - a.date)
    : [];
  const aEncaisser = groupe ? groupe.eleves.filter((e) => e.sessionsInCurrentCycle >= limite) : [];
  const montantDu = aEncaisser.reduce((s, e) => s + e.sessionsInCurrentCycle * prix(e), 0);
  const ceMois = paiementsGroupe.filter((p) => estEncaisse(p) && p.date >= debutMois.getTime()).reduce((s, p) => s + p.montant, 0);

  const messageRelance = (e: Eleve) => remplirModele(d.reglages.smsTemplatePaiement, {
    prenom: e.prenom, nom: e.nom, classe: e.classe, montant: formatMontant(e.sessionsInCurrentCycle * prix(e)), devise, seances: String(e.sessionsInCurrentCycle),
  });

  if (!d.eleves.length) return (<><div className="topbar"><h1>Paiements</h1></div><Vide icone={<Wallet size={48} />} texte="Ajoutez d'abord des élèves." /></>);

  return (
    <>
      <div className="topbar"><h1>Paiements</h1></div>

      <div className="small bold muted" style={{ marginBottom: 6 }}>1. Choisissez le groupe</div>
      <div className="groupes-paiement">
        {groupes.map((g) => {
          const dus = g.eleves.filter((e) => e.sessionsInCurrentCycle >= limite).length;
          return (
            <button key={g.nom} className={`card groupe-paiement ${groupe?.nom === g.nom ? "on" : ""}`} onClick={() => setChoix(g.nom)}>
              <span className="bold ellipsis">{g.nom}</span>
              <span className="tiny muted">{g.eleves.length} élève{g.eleves.length > 1 ? "s" : ""}</span>
              {dus > 0 ? <span className="badge red">{dus} à encaisser</span> : <span className="badge green">À jour</span>}
            </button>
          );
        })}
      </div>

      {groupe && (
        <>
          <div className="grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", margin: "16px 0" }}>
            <div className="card stat" style={{ cursor: "default" }}><div className="label">À encaisser · {groupe.nom}</div><div className="value money" style={{ color: montantDu ? "var(--red)" : "var(--green)" }}>{formatMontant(montantDu)} <span className="small">{devise}</span></div></div>
            <div className="card stat" style={{ cursor: "default" }}><div className="label">Encaissé ce mois</div><div className="value money" style={{ color: "var(--green)" }}>{formatMontant(ceMois)} <span className="small">{devise}</span></div></div>
          </div>

          <div className="tabs">
            <button className={onglet === "encaisser" ? "on" : ""} onClick={() => setOnglet("encaisser")}>2. Élèves du groupe</button>
            <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({paiementsGroupe.length})</button>
          </div>

          {onglet === "encaisser" ? (
            groupe.eleves.length === 0 ? <div className="card pad muted small">Aucun élève dans ce groupe.</div> : (
              <div className="list">
                {groupe.eleves.map((e) => {
                  const dues = e.sessionsInCurrentCycle;
                  const dernier = d.paiements.filter((p) => p.eleveId === e.id).sort((a, b) => b.date - a.date)[0];
                  const payeAujourdhui = dernier && estAujourdhui(dernier.date) && dues <= 0;
                  const doit = dues >= limite;
                  return (
                    <div key={e.id} className="card pad stack" style={{ gap: 8, ...(doit ? { borderColor: "color-mix(in srgb, var(--red) 35%, var(--border))" } : {}) }}>
                      <div className="row">
                        <div className="avatar">{initiales(e.prenom, e.nom)}</div>
                        <div className="grow">
                          <div className="row" style={{ gap: 6 }}>
                            <span className="bold ellipsis">{e.prenom} {e.nom}</span>
                            {payeAujourdhui ? <span className="badge green">✓ Payé</span>
                              : <span className={`badge ${doit ? "red" : dues > 0 ? "orange" : "green"}`}>{libelleCycle(dues, limite)}</span>}
                          </div>
                          <div className="small muted">
                            {doit ? <>{dues} séances à payer · <b style={{ color: "var(--text)" }}>{formatMontant(dues * prix(e))} {devise}</b></>
                              : dues > 0 ? <>{dues} séance{dues > 1 ? "s" : ""} faite{dues > 1 ? "s" : ""} · rappel de paiement à {limite}</>
                              : dues < 0 ? <>Crédit : {-dues} séance(s) payée(s) d'avance</> : <>À jour</>}
                          </div>
                          <div className="tiny muted">
                            {dernier ? <>Dernier paiement : {formatDate(dernier.date)} · {formatMontant(dernier.montant)} {devise} · {dernier.nbSeancesReglees} séance(s)</> : "Aucun paiement"}
                            {doit && e.dernierRappel && <> · relancé le {formatDate(e.dernierRappel)}</>}
                          </div>
                        </div>
                      </div>
                      <div className="row wrap" style={{ gap: 6 }}>
                        {/* Paiement libre : l'élève peut régler 3, 5… séances quand il le souhaite */}
                        <button className={`btn small ${doit ? "success" : "secondary"}`} onClick={() => setPayer(e)}><Wallet size={15} />Encaisser</button>
                        {doit && destinataires(e).map((x) => (
                          <a key={x.telephone} className="btn secondary small" href={lienWhatsapp(x.telephone, messageRelance(e))} target="_blank" rel="noreferrer"
                            onClick={() => actions.noterRappel(e.id)}><MessageCircle size={15} />Relance {x.libelle.toLowerCase()}</a>
                        ))}
                        {doit && destinataires(e)[0] && (
                          <a className="btn secondary small" href={lienSms(destinataires(e)[0].telephone, messageRelance(e))} onClick={() => actions.noterRappel(e.id)}><MessageSquare size={15} />SMS</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : paiementsGroupe.length === 0 ? (
            <Vide icone={<Wallet size={48} />} texte="Aucun paiement pour ce groupe." />
          ) : (
            <div className="list">
              <div className="tiny muted">🔒 Versements verrouillés : touchez-en un pour le modifier ou l'annuler (code d'accès).</div>
              {paiementsGroupe.map((p) => (
                <div key={p.id} className="card item clickable" onClick={() => setADeverrouiller(p)} title="Déverrouiller pour modifier (code d'accès)">
                  <div className="grow">
                    <div className="bold ellipsis">{p.nomEleve}</div>
                    <div className="small">Payé le <b>{formatDate(p.date)}</b> · <b>{p.nbSeancesReglees} séance{p.nbSeancesReglees > 1 ? "s" : ""}</b> · {p.modePaiement}</div>
                    {p.observation && <div className="tiny muted">{p.observation}</div>}
                    {!estEncaisse(p) && (
                      <button className="badge orange" style={{ border: 0, cursor: "pointer", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}
                        onClick={(ev) => { ev.stopPropagation(); actions.modifierPaiement({ ...p, encaisse: true }); toast("Marqué comme encaissé"); }}>
                        <Hourglass size={12} />Non encaissé · marquer encaissé
                      </button>
                    )}
                  </div>
                  <span className="money" style={{ color: estEncaisse(p) ? "var(--green)" : "var(--orange)" }}>+{formatMontant(p.montant)} {devise}</span>
                  <button className="icon-btn" title="Reçu PDF" aria-label="Reçu PDF" onClick={(ev) => { ev.stopPropagation(); setRecu(p); }}><FileText size={17} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {aDeverrouiller && (
        <DemandeCode
          titre="Déverrouiller ce versement ?"
          message={`${aDeverrouiller.nomEleve} — ${formatMontant(aDeverrouiller.montant)} ${devise} du ${formatDate(aDeverrouiller.date)}. Saisissez le code d'accès pour le modifier ou l'annuler.`}
          libelle="Déverrouiller"
          onValide={() => setAModifier(aDeverrouiller)}
          onClose={() => setADeverrouiller(null)}
        />
      )}
      {payer && <FormPaiement eleve={payer} onClose={() => setPayer(null)} onCree={setRecu} />}
      {recu && <EnvoiRecu paiementId={recu.id} onClose={() => setRecu(null)} />}
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
          libelle="Annuler le versement"
          onConfirm={() => actions.supprimerPaiement(aSupprimer.id)}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}

/** Relances de paiement à envoyer (affiché sur l'accueil). */
export function RelancesPaiement({ eleves }: { eleves: Eleve[] }) {
  const d = useDonnees();
  const { devise, seancesParPaiement: limite } = d.reglages;
  if (!eleves.length) return null;
  return (
    <div className="card pad stack" style={{ gap: 8 }}>
      <div className="row bold"><BellRing size={18} style={{ color: "var(--orange)" }} />Relances de paiement à envoyer ({eleves.length})</div>
      <div className="tiny muted">Élèves à {limite} séances ou plus, pas encore relancés (ou relancés il y a plus de {d.reglages.relanceJours} jours).</div>
      {eleves.map((e) => {
        const msg = remplirModele(d.reglages.smsTemplatePaiement, {
          prenom: e.prenom, nom: e.nom, classe: e.classe, montant: formatMontant(e.sessionsInCurrentCycle * prixSeance(d, e)), devise, seances: String(e.sessionsInCurrentCycle),
        });
        const dest = destinataires(e);
        return (
          <div key={e.id} className="row wrap" style={{ gap: 6 }}>
            <div className="grow small"><b>{e.prenom} {e.nom}</b> <span className="muted">· {e.groupe || SANS_GROUPE} · {e.sessionsInCurrentCycle} séances</span></div>
            {dest.map((x) => (
              <a key={x.telephone} className="btn success small" href={lienWhatsapp(x.telephone, msg)} target="_blank" rel="noreferrer" onClick={() => actions.noterRappel(e.id)}><MessageCircle size={14} />{dest.length > 1 ? x.libelle : "WhatsApp"}</a>
            ))}
            {dest[0] && <a className="btn secondary small" href={lienSms(dest[0].telephone, msg)} onClick={() => actions.noterRappel(e.id)}><MessageSquare size={14} />SMS</a>}
          </div>
        );
      })}
    </div>
  );
}

/** Nouveau versement, ou modification d'un versement existant. */
function FormPaiement({ eleve, paiement, onClose, onSupprimer, onCree }: { eleve: Eleve | null; paiement?: Paiement; onClose: () => void; onSupprimer?: () => void; onCree?: (p: Paiement) => void }) {
  const d = useDonnees();
  const { seancesParPaiement, tarifForfait, devise } = d.reglages;
  const prixUnitaire = eleve ? prixSeance(d, eleve) : tarifForfait / Math.max(1, seancesParPaiement);
  // Par défaut : on règle toutes les séances faites → le compteur repart de 0
  // Par défaut : les séances faites non payées (sinon un forfait) ; modifiable librement (3, 5…)
  const nbInitial = paiement?.nbSeancesReglees ?? ((eleve?.sessionsInCurrentCycle ?? 0) > 0 ? eleve!.sessionsInCurrentCycle : seancesParPaiement);
  const [nb, setNb] = useState(nbInitial);
  const [montant, setMontant] = useState(String(paiement?.montant ?? Math.round(prixUnitaire * nbInitial * 100) / 100));
  const [montantModifie, setMontantModifie] = useState(!!paiement);
  const [mode, setMode] = useState(paiement?.modePaiement ?? MODES_PAIEMENT[0]);
  const [obs, setObs] = useState(paiement?.observation ?? "");
  const [encaisse, setEncaisse] = useState(paiement ? paiement.encaisse !== false : true);

  // Séances faites non payées avant ce versement
  const dues = (eleve?.sessionsInCurrentCycle ?? 0) + (paiement?.nbSeancesReglees ?? 0);
  const reste = dues - nb;
  // Paiement libre : de 1 séance à 99
  const minimum = 1;
  const changerNb = (n: number) => {
    const v = Math.min(99, Math.max(minimum, Math.round(n)));
    setNb(v);
    if (!montantModifie) setMontant(String(Math.round(prixUnitaire * v * 100) / 100));
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
          const m = lireNombre(montant, prixUnitaire * nb);
          if (paiement) {
            actions.modifierPaiement({ ...paiement, montant: m, modePaiement: mode, nbSeancesReglees: nb, observation: obs.trim(), encaisse });
            toast("Versement modifié");
          } else if (eleve) {
            const cree = actions.enregistrerPaiement({ eleve, montant: m, modePaiement: mode, nbSeances: nb, observation: obs.trim(), encaisse });
            onCree?.(cree);
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
          {Array.from(new Set([...(dues > 0 ? [dues] : []), 1, 2, 3, 4, 5, 6, 8, seancesParPaiement])).sort((a, b) => a - b).map((n) => (
            <button key={n} type="button" className={`chip ${nb === n ? "on" : ""}`} onClick={() => changerNb(n)}>{n} séance{n > 1 ? "s" : ""}</button>
          ))}
        </div>
      </Field>
      <div className="alert blue small"><div>
        {reste > 0 && <>Séances faites non payées : <b>{dues}</b> → il en restera <b>{reste}</b> à payer.</>}
        {reste === 0 && <>Séances faites non payées : <b>{dues}</b> → tout est réglé, le compteur repart de <b>0</b>.</>}
        {reste < 0 && <>Séances faites non payées : <b>{Math.max(0, dues)}</b> → crédit de <b>{-reste}</b> séance(s) payée(s) d'avance.</>}
      </div></div>
      <Field label={`Montant (${devise}) — ${formatMontant(prixUnitaire)} ${devise} par séance`}>
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


/** Après un encaissement : reçu PDF à envoyer à l'élève (WhatsApp…) ou à télécharger. */
function EnvoiRecu({ paiementId, onClose }: { paiementId: string; onClose: () => void }) {
  const d = useDonnees();
  const p = d.paiements.find((x) => x.id === paiementId);
  const eleve = p && d.eleves.find((e) => e.id === p.eleveId);
  if (!p) return null;
  const texte = `Bonjour ${eleve?.prenom ?? ""}, voici votre reçu de paiement : ${formatMontant(p.montant)} ${d.reglages.devise} pour ${p.nbSeancesReglees} séance(s), le ${formatDate(p.date)}. Merci !`;

  const fabriquer = async () => {
    const { recuPaiement } = await import("../pdf");
    const { blob, nom } = recuPaiement(d, p);
    return new File([blob], nom, { type: "application/pdf" });
  };
  const telecharger = async () => {
    const f = await fabriquer();
    const url = URL.createObjectURL(f);
    const a = document.createElement("a"); a.href = url; a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const partager = async () => {
    const f = await fabriquer();
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: texte, title: "Reçu de paiement" }); toast("Reçu partagé"); onClose(); } catch { /* partage annulé */ }
    } else {
      // Ordinateur : on télécharge le PDF puis on ouvre WhatsApp avec le message (joindre le fichier téléchargé)
      await telecharger();
      const dest = eleve ? destinataires(eleve)[0] : undefined;
      if (dest) window.open(lienWhatsapp(dest.telephone, texte), "_blank");
      toast("Reçu téléchargé : joignez-le dans la conversation WhatsApp");
    }
  };

  return (
    <Modal titre="Reçu de paiement" onClose={onClose} footer={<button className="btn secondary" onClick={onClose}>Fermer</button>}>
      <div className="alert green"><div><b>{p.nomEleve}</b> · {formatMontant(p.montant)} {d.reglages.devise} · {p.nbSeancesReglees} séance(s) · {formatDate(p.date)}</div></div>
      <div className="small muted">Envoyez le reçu PDF à l'élève : sur téléphone, choisissez WhatsApp dans la liste de partage.</div>
      <button className="btn success" onClick={partager}><Share2 size={18} />Envoyer le reçu (WhatsApp…)</button>
      <button className="btn secondary" onClick={telecharger}><Download size={18} />Télécharger le PDF</button>
    </Modal>
  );
}
