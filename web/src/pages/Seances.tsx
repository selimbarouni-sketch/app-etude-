import { useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardList, Clock, Lock } from "lucide-react";
import { actions, appelDuJour, etatAppel, groupesDuJour, useDonnees } from "../store";
import type { Statut } from "../types";
import { DemandeCode, Vide, toast } from "../components";
import { notifierPaiementsAttendus } from "../notifier";
import { dureeEntre, formatDate, formatDateLongue, formatDuree, formatJourCourt, heureDe, prochainCreneau } from "../utils";

const LIBELLES: Record<Statut, string> = { P: "Présent", A: "Absent", R: "Retard" };
const COULEURS: Record<Statut, string> = { P: "green", A: "red", R: "orange" };

export default function Seances() {
  const [onglet, setOnglet] = useState<"appel" | "historique">("appel");
  const d = useDonnees();
  return (
    <>
      <div className="topbar"><h1>Séances & présences</h1></div>
      <div className="tabs">
        <button className={onglet === "appel" ? "on" : ""} onClick={() => setOnglet("appel")}>Appel du jour</button>
        <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({d.seances.length})</button>
      </div>
      {onglet === "appel" ? <Appel /> : <Historique />}
    </>
  );
}

/**
 * Appel du jour, d'après la date et l'heure du téléphone :
 * - seuls les groupes dont la séance est programmée aujourd'hui (créneau hebdomadaire) apparaissent ;
 * - l'appel s'ouvre 30 minutes avant le début de la séance ;
 * - une fois validé il est verrouillé (correction le jour même avec le code d'accès).
 */
function Appel() {
  const d = useDonnees();
  const [maintenant] = useState(Date.now());
  const duJour = groupesDuJour(d, maintenant);
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const [choix, setChoix] = useState<string | null>(() => {
    const ouverts = duJour.filter((g) => etatAppel(g, maintenant).ouvert && !appelDuJour(d, g.nom, maintenant).length);
    return (ouverts[0] ?? duJour[0])?.id ?? null;
  });
  const groupe = duJour.find((g) => g.id === choix) ?? null;
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [corriger, setCorriger] = useState(false);

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
    const prochains = d.groupes.map((g) => ({ g, date: prochainCreneau(g.jourSemaine, g.heureDebut, maintenant) })).sort((a, b) => a.date - b.date).slice(0, 3);
    return (
      <div className="stack">
        {entete}
        <Vide icone={<ClipboardList size={48} />} texte="Aucune séance programmée aujourd'hui : pas d'appel à faire." />
        {prochains.length > 0 && (
          <div className="card pad small">
            <div className="bold" style={{ marginBottom: 6 }}>Prochaines séances</div>
            {prochains.map(({ g, date }) => <div key={g.id}>{formatJourCourt(date)} à {g.heureDebut} — {g.nom}</div>)}
          </div>
        )}
      </div>
    );
  }

  const eleves = groupe ? d.eleves.filter((e) => memeNom(e.groupe, groupe.nom)).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr")) : [];
  const dejaFait = groupe ? appelDuJour(d, groupe.nom, maintenant) : [];
  const etat = groupe ? etatAppel(groupe, maintenant) : null;
  const st = (id: string): Statut => statuts[id] ?? "P";
  const nb = (s: Statut) => eleves.filter((e) => st(e.id) === s).length;

  return (
    <div className="stack">
      {entete}
      <div className="small bold muted">Séances programmées aujourd'hui</div>
      <div className="list">
        {duJour.map((g) => {
          const fait = appelDuJour(d, g.nom, maintenant).length > 0;
          const e = etatAppel(g, maintenant);
          return (
            <button key={g.id} className={`card item clickable ${choix === g.id ? "selection" : ""}`} style={{ textAlign: "left", width: "100%" }}
              onClick={() => { setChoix(g.id); setStatuts({}); }}>
              <span className="badge blue">{g.heureDebut}</span>
              <div className="grow">
                <div className="bold ellipsis">{g.nom}</div>
                <div className="tiny muted">{g.heureDebut}–{g.heureFin} · {g.lieu}</div>
              </div>
              {fait ? <span className="badge green">✓ Appel fait</span>
                : e.ouvert ? <span className="badge orange">Appel à faire</span>
                : <span className="badge">Ouvre à {heureDe(e.ouverture)}</span>}
            </button>
          );
        })}
      </div>

      {groupe && etat && (
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
            <div>L'appel de <b>{groupe.nom}</b> s'ouvrira à <b>{heureDe(etat.ouverture)}</b> (30 min avant la séance de {groupe.heureDebut}).</div>
          </div>
        ) : eleves.length === 0 ? (
          <div className="card pad muted small">Aucun élève dans ce groupe. Ajoutez des élèves depuis l'écran Groupes.</div>
        ) : (
          <>
            <div className="card pad row wrap">
              <div className="grow bold">{groupe.nom} · {groupe.heureDebut}–{groupe.heureFin}</div>
              <span className="badge green">P : {nb("P")}</span>
              <span className="badge red">A : {nb("A")}</span>
              <span className="badge orange">R : {nb("R")}</span>
            </div>
            <div className="list">
              {eleves.map((e) => (
                <div key={e.id} className="card item">
                  <div className="grow">
                    <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                    <div className="small muted ellipsis">{e.classe}</div>
                  </div>
                  <div className="statut-group">
                    {(["P", "A", "R"] as Statut[]).map((s) => (
                      <button key={s} title={LIBELLES[s]} className={`statut-btn ${s} ${st(e.id) === s ? "on" : ""}`}
                        onClick={() => setStatuts({ ...statuts, [e.id]: s })}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn block" style={{ padding: 14 }} onClick={() => {
              const atteints = actions.enregistrerAppel(eleves.map((e) => ({
                eleveId: e.id, date: etat.debut, heure: groupe.heureDebut,
                dureeHeures: dureeEntre(groupe.heureDebut, groupe.heureFin) ?? d.reglages.dureeParDefautHeures,
                statut: st(e.id), commentaire: "", nomEleve: `${e.prenom} ${e.nom}`, groupe: groupe.nom,
              })));
              setStatuts({});
              toast("Appel enregistré et verrouillé");
              notifierPaiementsAttendus(atteints, d.reglages.seancesParPaiement);
            }}>
              <CheckCircle2 size={19} />Valider l'appel ({eleves.length} élève{eleves.length > 1 ? "s" : ""})
            </button>
          </>
        )
      )}
    </div>
  );
}

/** Historique en lecture seule : les séances passées ne peuvent plus être modifiées. */
function Historique() {
  const d = useDonnees();
  const [q, setQ] = useState("");
  const liste = [...d.seances]
    .sort((a, b) => b.date - a.date)
    .filter((s) => !q || (s.nomEleve + " " + s.groupe).toLowerCase().includes(q.toLowerCase()));

  if (d.seances.length === 0) return <Vide icone={<ClipboardList size={48} />} texte="Aucune séance enregistrée." />;
  return (
    <>
      <div className="row small muted" style={{ marginBottom: 8, gap: 6 }}><Lock size={14} />Historique verrouillé : les séances passées ne peuvent plus être modifiées.</div>
      <input className="input" placeholder="Filtrer par élève ou groupe…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="list">
        {liste.slice(0, 300).map((s) => (
          <div key={s.id} className="card item">
            <div className="grow">
              <div className="bold ellipsis">{s.nomEleve}</div>
              <div className="small muted">{formatDate(s.date)} à {s.heure} · {formatDuree(s.dureeHeures)} h{s.groupe && ` · ${s.groupe}`}</div>
            </div>
            <span className={`badge ${COULEURS[s.statut]}`}>{LIBELLES[s.statut]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
