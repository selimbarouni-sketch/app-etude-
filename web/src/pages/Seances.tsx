import { useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardList, Clock, Lock, LockOpen, Plus } from "lucide-react";
import { actions, appelDuJour, etatAppel, prochainesSeances, rattrapagesDuJour, seancesDuJour, useDonnees } from "../store";
import type { Seance, Statut } from "../types";
import { DemandeCode, Modal, Vide, toast } from "../components";
import Semaine from "./Semaine";
import AncienneSeance from "./AncienneSeance";
import { notifierAbsences, notifierPaiementsAttendus } from "../notifier";
import { dureeEntre, formatDate, formatDateLongue, formatJourCourt, heureDe } from "../utils";

const LIBELLES: Record<Statut, string> = { P: "Présent", A: "Absent", R: "Retard", J: "Absence justifiée" };
const COULEURS: Record<Statut, string> = { P: "green", A: "red", R: "orange", J: "blue" };

export default function Seances() {
  const [onglet, setOnglet] = useState<"appel" | "semaine" | "historique" | "ancienne">("appel");
  const d = useDonnees();
  return (
    <>
      <div className="topbar">
        <h1>Séances & présences</h1>
        <button
          type="button"
          className="btn primary small"
          onClick={() => setOnglet("ancienne")}
          style={{ marginLeft: "auto" }}
        >
          <Plus size={16} /> Ancienne séance
        </button>
      </div>
      <div className="tabs">
        <button className={onglet === "appel" ? "on" : ""} onClick={() => setOnglet("appel")}>Appel du jour</button>
        <button className={onglet === "semaine" ? "on" : ""} onClick={() => setOnglet("semaine")}>Semaine</button>
        <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({d.seances.length})</button>
        <button className={onglet === "ancienne" ? "on" : ""} onClick={() => setOnglet("ancienne")}>+ Ancienne séance</button>
      </div>
      {onglet === "appel" ? (
        <Appel onOuvrirAncienne={() => setOnglet("ancienne")} />
      ) : onglet === "semaine" ? (
        <Semaine />
      ) : onglet === "ancienne" ? (
        <AncienneSeance onTermine={() => setOnglet("historique")} />
      ) : (
        <Historique onOuvrirAncienne={() => setOnglet("ancienne")} />
      )}
    </>
  );
}

/**
 * Appel du jour, d'après la date et l'heure du téléphone :
 * - seuls les groupes dont la séance est programmée aujourd'hui (créneau hebdomadaire) apparaissent ;
 * - l'appel s'ouvre 30 minutes avant le début de la séance ;
 * - une fois validé il est verrouillé (correction le jour même avec le code d'accès).
 */
function Appel({ onOuvrirAncienne }: { onOuvrirAncienne?: () => void } = {}) {
  const d = useDonnees();
  const [maintenant] = useState(Date.now());
  const duJour = seancesDuJour(d, maintenant);
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const [choix, setChoix] = useState<string | null>(() => {
    const actives = duJour.filter((s) => !s.annulee);
    const ouverts = actives.filter((s) => etatAppel(s, maintenant).ouvert && !appelDuJour(d, s.groupe.nom, maintenant).length);
    return (ouverts[0] ?? actives[0])?.groupe.id ?? null;
  });
  const seance = duJour.find((s) => s.groupe.id === choix && !s.annulee) ?? null;
  const groupe = seance?.groupe ?? null;
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [corriger, setCorriger] = useState(false);
  const [chapitre, setChapitre] = useState("");
  const [devoirs, setDevoirs] = useState("");

  const entete = (
    <div className="card pad row" style={{ gap: 10 }}>
      <CalendarCheck size={22} style={{ color: "var(--primary)", flexShrink: 0 }} />
      <div className="grow">
        <div className="bold">{formatDateLongue(maintenant)} · {heureDe(maintenant)}</div>
        <div className="tiny muted">Date et heure lues sur votre appareil</div>
      </div>
    </div>
  );

  if (duJour.length === 0) {
    const prochaines = prochainesSeances(d, maintenant, undefined, 3);
    return (
      <div className="stack">
        {entete}
        {rattrapagesDuJour(d, maintenant).length === 0 && <Vide icone={<ClipboardList size={48} />} texte="Aucune séance programmée aujourd'hui : pas d'appel à faire." />}
        {onOuvrirAncienne && (
          <div className="card pad row" style={{ gap: 12, alignItems: "center", background: "var(--primary-soft, #eff6ff)" }}>
            <div className="grow">
              <div className="bold" style={{ color: "var(--primary)" }}>Séance passée oubliée ?</div>
              <div className="small muted">Rattrapez vos séances pour comptabiliser les élèves.</div>
            </div>
            <button type="button" className="btn primary small" onClick={onOuvrirAncienne}>
              <Plus size={16} /> Ancienne séance
            </button>
          </div>
        )}
        <RattrapagesDuJour maintenant={maintenant} />
        {prochaines.length > 0 && (
          <div className="card pad small">
            <div className="bold" style={{ marginBottom: 6 }}>Prochaines séances</div>
            {prochaines.map((p) => <div key={p.groupe.id + p.debut}>{formatJourCourt(p.debut)} à {p.heureDebut} — {p.groupe.nom}{p.reportDe ? " (reportée)" : ""}</div>)}
          </div>
        )}
      </div>
    );
  }

  const eleves = groupe ? d.eleves.filter((e) => memeNom(e.groupe, groupe.nom)).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr")) : [];
  const dejaFait = groupe ? appelDuJour(d, groupe.nom, maintenant) : [];
  const etat = seance ? etatAppel(seance, maintenant) : null;
  const st = (id: string): Statut => statuts[id] ?? "P";
  const nb = (s: Statut) => eleves.filter((e) => st(e.id) === s).length;

  return (
    <div className="stack">
      {entete}
      <div className="small bold muted">Séances programmées aujourd'hui</div>
      <div className="list">
        {duJour.map((s) => {
          const fait = appelDuJour(d, s.groupe.nom, maintenant).length > 0;
          const e = etatAppel(s, maintenant);
          return (
            <button key={s.groupe.id} disabled={!!s.annulee}
              className={`card item ${s.annulee ? "" : "clickable"} ${choix === s.groupe.id && !s.annulee ? "selection" : ""}`}
              style={{ textAlign: "left", width: "100%", ...(s.annulee ? { opacity: 0.6 } : {}) }}
              onClick={() => { setChoix(s.groupe.id); setStatuts({}); }}>
              <span className="badge blue">{s.heureDebut}</span>
              <div className="grow">
                <div className="bold ellipsis" style={s.annulee ? { textDecoration: "line-through" } : undefined}>{s.groupe.nom}</div>
                <div className="tiny muted">
                  {s.heureDebut}–{s.heureFin} · {s.groupe.lieu}
                  {s.reportDe ? ` · reportée du ${formatJourCourt(s.reportDe)}` : ""}
                  {s.annulee?.motif ? ` · ${s.annulee.motif}` : ""}
                </div>
              </div>
              {s.annulee ? <span className="badge red">Annulée</span>
                : fait ? <span className="badge green">✓ Appel fait</span>
                : e.ouvert ? <span className="badge orange">Appel à faire</span>
                : <span className="badge">Ouvre à {heureDe(e.ouverture)}</span>}
            </button>
          );
        })}
      </div>

      <RattrapagesDuJour maintenant={maintenant} />

      {!seance || !groupe || !etat ? null : (
        dejaFait.length > 0 ? (
          <>
            <div className="alert green">
              <Lock size={20} />
              <div className="grow">
                <div className="bold">Appel de {groupe.nom} validé</div>
                <div className="small">Il est verrouillé : inutile de le refaire.</div>
              </div>
            </div>
            <div className="list">
              {dejaFait.map((s) => (
                <div key={s.id} className="card item">
                  <div className="grow bold ellipsis">{s.nomEleve}</div>
                  <span className={`badge ${COULEURS[s.statut]}`}>{LIBELLES[s.statut]}</span>
                </div>
              ))}
            </div>
            <button className="btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => setCorriger(true)}>Corriger l'appel d'aujourd'hui (code requis)</button>
            {corriger && (
              <DemandeCode
                titre="Corriger l'appel ?"
                message="L'appel de ce groupe pour aujourd'hui sera rouvert pour être refait. Les compteurs de séances seront rétablis."
                libelle="Rouvrir l'appel"
                onValide={() => { actions.annulerAppel(groupe.nom, maintenant); toast("Appel rouvert : vous pouvez le refaire"); }}
                onClose={() => setCorriger(false)}
              />
            )}
          </>
        ) : !etat.ouvert ? (
          <div className="alert blue">
            <Clock size={20} />
            <div>L'appel de <b>{groupe.nom}</b> s'ouvrira à <b>{heureDe(etat.ouverture)}</b> (30 min avant la séance de {seance.heureDebut}).</div>
          </div>
        ) : eleves.length === 0 ? (
          <div className="card pad muted small">Aucun élève dans ce groupe. Ajoutez des élèves depuis l'écran Groupes.</div>
        ) : (
          <>
            <div className="card pad row wrap">
              <div className="grow bold">{groupe.nom} · {seance.heureDebut}–{seance.heureFin}</div>
              <span className="badge green">P : {nb("P")}</span>
              <span className="badge red">A : {nb("A")}</span>
              <span className="badge orange">R : {nb("R")}</span>
              <span className="badge blue">J : {nb("J")}</span>
            </div>
            <div className="tiny muted">P présent · A absent · R retard · J absence justifiée (non comptée)</div>
            <div className="list">
              {eleves.map((e) => (
                <div key={e.id} className="card item">
                  <div className="grow bold ellipsis">{e.prenom} {e.nom}</div>
                  <div className="statut-group">
                    {(["P", "A", "R", "J"] as Statut[]).map((c) => (
                      <button key={c} title={LIBELLES[c]}
                        className={`statut-btn ${c} ${st(e.id) === c ? "on" : ""}`}
                        onClick={() => setStatuts({ ...statuts, [e.id]: c })}>{c}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="card pad stack" style={{ gap: 8 }}>
              <div className="bold small">Cahier de texte (optionnel)</div>
              <input className="input" placeholder="Chapitre ou notion abordée (ex. Fonctions affines)"
                value={chapitre} onChange={(e) => setChapitre(e.target.value)} />
              <textarea className="input" rows={2} placeholder="Devoirs ou exercices donnés pour la prochaine séance…"
                value={devoirs} onChange={(e) => setDevoirs(e.target.value)} />
            </div>

            <button className="btn primary" onClick={() => {
              if (chapitre.trim() || devoirs.trim()) {
                const suivante = prochainesSeances(d, seance.debut + 60_000, groupe.nom, 1)[0];
                actions.enregistrerCahier({ groupe: groupe.nom, date: seance.debut, chapitre: chapitre.trim(), devoirs: devoirs.trim(), pourLe: devoirs.trim() ? suivante?.debut : undefined });
                setChapitre(""); setDevoirs("");
              }
              const atteints = actions.enregistrerAppel(eleves.map((e) => ({
                eleveId: e.id, date: seance.debut, heure: seance.heureDebut,
                dureeHeures: dureeEntre(seance.heureDebut, seance.heureFin) ?? d.reglages.dureeParDefautHeures,
                statut: st(e.id), commentaire: "", nomEleve: `${e.prenom} ${e.nom}`, groupe: groupe.nom,
              })));
              setStatuts({});
              toast("Appel enregistré et verrouillé");
              notifierPaiementsAttendus(atteints, d.reglages.seancesParPaiement);
              notifierAbsences();
            }}>
              <CheckCircle2 size={19} />Valider l'appel ({eleves.length} élève{eleves.length > 1 ? "s" : ""})
            </button>
          </>
        )
      )}
    </div>
  );
}

/**
 * Historique : séances regroupées par groupe et par jour, verrouillées.
 * Une séance peut être déverrouillée avec le code d'accès pour corriger les présences.
 */
function Historique({ onOuvrirAncienne }: { onOuvrirAncienne?: () => void } = {}) {
  const d = useDonnees();
  const [q, setQ] = useState("");
  const [aDeverrouiller, setADeverrouiller] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  const seancesGroupees = (() => {
    const m = new Map<string, Seance[]>();
    [...d.seances].sort((a, b) => b.date - a.date).forEach((s) => {
      const cle = `${s.groupe}|${new Date(s.date).toDateString()}`;
      m.set(cle, [...(m.get(cle) ?? []), s]);
    });
    return Array.from(m.entries()).map(([cle, liste]) => ({ cle, groupe: liste[0].groupe, date: liste[0].date, heure: liste[0].heure, liste }));
  })().filter((x) => !q || (x.groupe + " " + x.liste.map((s) => s.nomEleve).join(" ")).toLowerCase().includes(q.toLowerCase()));

  if (d.seances.length === 0) {
    return (
      <div className="stack" style={{ alignItems: "center", gap: 14, padding: "32px 16px" }}>
        <Vide icone={<ClipboardList size={48} />} texte="Aucune séance enregistrée." />
        {onOuvrirAncienne && (
          <button type="button" className="btn primary" onClick={onOuvrirAncienne}>
            <Plus size={16} /> Ajouter une ancienne séance (oubliée)
          </button>
        )}
      </div>
    );
  }
  const enCours = seancesGroupees.find((x) => x.cle === ouverte);
  return (
    <>
      <div className="row small muted" style={{ marginBottom: 8, gap: 6 }}><Lock size={14} />Séances verrouillées. « Déverrouiller » (code d'accès) permet de corriger les présences.</div>
      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <input className="input grow" placeholder="Filtrer par groupe ou élève…" value={q} onChange={(e) => setQ(e.target.value)} />
        {onOuvrirAncienne && (
          <button type="button" className="btn primary" style={{ whiteSpace: "nowrap" }} onClick={onOuvrirAncienne}>
            <Plus size={16} /> Ancienne séance
          </button>
        )}
      </div>
      <div className="list">
        {seancesGroupees.slice(0, 200).map((x) => {
          const nb = (st: Statut) => x.liste.filter((s) => s.statut === st).length;
          const corrigee = x.liste.some((s) => s.modifieLe);
          return (
            <div key={x.cle} className="card pad stack" style={{ gap: 6 }}>
              <div className="row">
                <div className="grow">
                  <div className="bold ellipsis">{x.groupe || "Sans groupe"}</div>
                  <div className="small muted">{formatDate(x.date)} à {x.heure}{corrigee && " · corrigée"}</div>
                </div>
                <button className="btn ghost small" onClick={() => setADeverrouiller(x.cle)}><LockOpen size={15} />Déverrouiller</button>
              </div>
              <div className="row wrap" style={{ gap: 4 }}>
                <span className="badge green">P {nb("P")}</span>
                {nb("A") > 0 && <span className="badge red">A {nb("A")}</span>}
                {nb("R") > 0 && <span className="badge orange">R {nb("R")}</span>}
                {nb("J") > 0 && <span className="badge blue">J {nb("J")}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {aDeverrouiller && (
        <DemandeCode
          titre="Déverrouiller la séance ?"
          message="Saisissez votre code d'accès pour modifier les présences de cette séance passée."
          libelle="Déverrouiller"
          onValide={() => { setOuverte(aDeverrouiller); setADeverrouiller(null); }}
          onClose={() => setADeverrouiller(null)}
        />
      )}

      {enCours && (
        <ModalCorrection
          titre={`Présences : ${enCours.groupe} (${formatDate(enCours.date)})`}
          liste={enCours.liste}
          onClose={() => setOuverte(null)}
        />
      )}
    </>
  );
}

/** Boîte de dialogue de correction des présences (après déverrouillage). */
function ModalCorrection({ titre, liste, onClose }: { titre: string; liste: Seance[]; onClose: () => void }) {
  const [statuts, setStatuts] = useState<Record<string, Statut>>(() =>
    Object.fromEntries(liste.map((s) => [s.id, s.statut]))
  );
  const changements = Object.fromEntries(Object.entries(statuts).filter(([id, st]) => liste.find((s) => s.id === id)?.statut !== st));
  const nbChangements = Object.keys(changements).length;
  return (
    <Modal titre={titre} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!nbChangements} onClick={() => {
          actions.modifierStatuts(changements);
          toast(`${nbChangements} présence(s) corrigée(s), séance reverrouillée`);
          onClose();
        }}><Lock size={16} />Enregistrer et reverrouiller</button></>}>
      <div className="alert blue small"><LockOpen size={18} /><div>Séance déverrouillée. Elle sera reverrouillée à l'enregistrement.</div></div>
      {liste.map((s) => (
        <div key={s.id} className="row">
          <span className="grow">{s.nomEleve}{statuts[s.id] !== s.statut && <span className="tiny" style={{ color: "var(--orange)" }}> · modifié</span>}</span>
          <div className="statut-group">
            {(["P", "A", "R", "J"] as Statut[]).map((x) => (
              <button key={x} title={LIBELLES[x]} className={`statut-btn ${x} ${statuts[s.id] === x ? "on" : ""}`} onClick={() => setStatuts({ ...statuts, [s.id]: x })}>{x}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="tiny muted">P présent · A absent · R retard · J absence justifiée (non comptée)</div>
    </Modal>
  );
}

/** Rattrapages individuels prévus aujourd'hui : appel élève par élève. */
function RattrapagesDuJour({ maintenant }: { maintenant: number }) {
  const d = useDonnees();
  const liste = rattrapagesDuJour(d, maintenant);
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  if (!liste.length) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="small bold muted">Rattrapages d'aujourd'hui</div>
      {liste.map((r) => {
        const e = d.eleves.find((x) => x.id === r.eleveId);
        if (!e) return null;
        const st = statuts[r.id] ?? "P";
        const ouvert = maintenant >= r.debut - 30 * 60_000;
        return (
          <div key={r.id} className="card item">
            <span className="badge blue">{r.heureDebut}</span>
            <div className="grow">
              <div className="bold ellipsis">{e.prenom} {e.nom}</div>
              <div className="tiny muted">
                Rattrapage {r.heureDebut}–{r.heureFin}
                {r.motif && ` · ${r.motif}`}
                {!r.comptee && " · non compté"}
              </div>
            </div>
            {r.statut ? (
              <span className={`badge ${COULEURS[r.statut]}`}>✓ {LIBELLES[r.statut]}</span>
            ) : !ouvert ? (
              <span className="badge">Ouvre 30 min avant</span>
            ) : (
              <div className="row" style={{ gap: 4 }}>
                <div className="statut-group">
                  {(["P", "A", "R", "J"] as Statut[]).map((c) => (
                    <button key={c} className={`statut-btn ${c} ${st === c ? "on" : ""}`}
                      onClick={() => setStatuts({ ...statuts, [r.id]: c })}>{c}</button>
                  ))}
                </div>
                <button className="btn primary small" onClick={() => {
                  actions.validerRattrapage(r.id, st);
                  toast("Rattrapage validé");
                }}>Valider</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
