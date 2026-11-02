import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Lock } from "lucide-react";
import { actions, appelDuJour, groupesDuJour, useDonnees } from "../store";
import type { Statut } from "../types";
import { DemandeCode, Field, Vide, toast } from "../components";
import { notifierPaiementsAttendus } from "../notifier";
import { combinerDateHeure, formatDate, formatDateLongue, formatDuree, lireNombre } from "../utils";

const LIBELLES: Record<Statut, string> = { P: "Présent", A: "Absent", R: "Retard" };
const COULEURS: Record<Statut, string> = { P: "green", A: "red", R: "orange" };
const SANS_GROUPE = "";

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
 * Appel : un seul appel par groupe et par jour. Une fois validé, il est verrouillé.
 * Une correction est possible le jour même, avec le code d'accès.
 */
function Appel() {
  const d = useDonnees();
  const aujourdhui = Date.now();
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  const choix = useMemo(() => {
    const liste = d.groupes.map((g) => ({ nom: g.nom, libelle: g.nom, heure: g.heureDebut }));
    if (d.eleves.some((e) => !d.groupes.some((g) => memeNom(g.nom, e.groupe)))) liste.push({ nom: SANS_GROUPE, libelle: "Sans groupe", heure: "" });
    return liste;
  }, [d.groupes, d.eleves]);
  const duJour = groupesDuJour(d, aujourdhui);
  const [groupe, setGroupe] = useState<string>(() => duJour[0]?.nom ?? choix[0]?.nom ?? SANS_GROUPE);
  const cfg = d.groupes.find((g) => g.nom === groupe);
  const [heure, setHeure] = useState(cfg?.heureDebut ?? "16:00");
  const [duree, setDuree] = useState(String(d.reglages.dureeParDefautHeures));
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [corriger, setCorriger] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const eleves = d.eleves
    .filter((e) => (groupe === SANS_GROUPE ? !d.groupes.some((g) => memeNom(g.nom, e.groupe)) : memeNom(e.groupe, groupe)))
    .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  const dejaFait = appelDuJour(d, groupe, aujourdhui);
  const st = (id: string): Statut => statuts[id] ?? "P";
  const nb = (s: Statut) => eleves.filter((e) => st(e.id) === s).length;
  const taux = eleves.length ? Math.round(((nb("P") + nb("R")) / eleves.length) * 100) : 0;

  const choisirGroupe = (g: string) => {
    setGroupe(g);
    setStatuts({});
    const c = d.groupes.find((x) => x.nom === g);
    if (c) setHeure(c.heureDebut);
  };

  if (d.eleves.length === 0) return <Vide icone={<ClipboardList size={48} />} texte="Ajoutez d'abord des élèves." />;

  return (
    <div className="stack">
      <div className="small muted">{formatDateLongue(aujourdhui)}{duJour.length > 0 && <> · cours prévus : {duJour.map((g) => `${g.nom} (${g.heureDebut})`).join(", ")}</>}</div>
      <div className="chips">
        {choix.map((g) => {
          const fait = appelDuJour(d, g.nom, aujourdhui).length > 0;
          return (
            <button key={g.libelle} className={`chip ${groupe === g.nom ? "on" : ""}`} onClick={() => choisirGroupe(g.nom)}>
              {fait && "✓ "}{g.libelle}
            </button>
          );
        })}
      </div>

      {dejaFait.length > 0 ? (
        <>
          <div className="alert green">
            <Lock size={20} />
            <div className="grow">
              <div className="bold">Appel déjà validé aujourd'hui</div>
              <div className="small">Il est verrouillé : il n'est pas nécessaire de le refaire.</div>
            </div>
          </div>
          <div className="list">
            {dejaFait.map((s) => (
              <div key={s.id} className="card item">
                <div className="grow">
                  <div className="bold ellipsis">{s.nomEleve}</div>
                  <div className="small muted">{s.heure} · {formatDuree(s.dureeHeures)} h</div>
                </div>
                <span className={`badge ${COULEURS[s.statut]}`}>{LIBELLES[s.statut]}</span>
              </div>
            ))}
          </div>
          <button className="btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => setCorriger(true)}>
            Corriger l'appel d'aujourd'hui (code requis)
          </button>
          {corriger && (
            <DemandeCode
              titre="Corriger l'appel ?"
              message="L'appel de ce groupe pour aujourd'hui sera rouvert pour être refait. Les compteurs de séances seront rétablis."
              libelle="Rouvrir l'appel"
              onValide={() => { actions.annulerAppel(groupe, aujourdhui); toast("Appel rouvert : vous pouvez le refaire"); }}
              onClose={() => setCorriger(false)}
            />
          )}
        </>
      ) : eleves.length === 0 ? (
        <div className="card pad muted small">Aucun élève dans ce groupe.</div>
      ) : (
        <>
          <div className="card pad stack">
            <div className="row wrap">
              <div className="grow bold">Présence : <span style={{ color: "var(--primary)" }}>{taux} %</span></div>
              <span className="badge green">P : {nb("P")}</span>
              <span className="badge red">A : {nb("A")}</span>
              <span className="badge orange">R : {nb("R")}</span>
            </div>
            <div className="fields-2">
              <Field label="Heure"><input className="input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></Field>
              <Field label="Durée (h)"><input className="input" inputMode="decimal" value={duree} onChange={(e) => setDuree(e.target.value)} /></Field>
            </div>
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

          <button className="btn block" style={{ padding: 14 }} disabled={envoi} onClick={() => {
            setEnvoi(true);
            const date = combinerDateHeure(aujourdhui, heure);
            const atteints = actions.enregistrerAppel(eleves.map((e) => ({
              eleveId: e.id, date, heure, dureeHeures: lireNombre(duree, d.reglages.dureeParDefautHeures),
              statut: st(e.id), commentaire: "", nomEleve: `${e.prenom} ${e.nom}`, groupe,
            })));
            setStatuts({});
            setEnvoi(false);
            toast("Appel enregistré et verrouillé");
            notifierPaiementsAttendus(atteints, d.reglages.seancesParPaiement);
          }}>
            <CheckCircle2 size={19} />Valider l'appel ({eleves.length} élève{eleves.length > 1 ? "s" : ""})
          </button>
        </>
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
