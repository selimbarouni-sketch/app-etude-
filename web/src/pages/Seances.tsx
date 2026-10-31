import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Trash2 } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Seance, Statut } from "../types";
import { Confirmation, Field, Vide, toast } from "../components";
import { combinerDateHeure, depuisInputDate, formatDate, formatDuree, lireNombre, versInputDate } from "../utils";

const LIBELLES: Record<Statut, string> = { P: "Présent", A: "Absent", R: "Retard" };
const COULEURS: Record<Statut, string> = { P: "green", A: "red", R: "orange" };

export default function Seances() {
  const [onglet, setOnglet] = useState<"appel" | "historique">("appel");
  const d = useDonnees();
  return (
    <>
      <div className="topbar"><h1>Séances & présences</h1></div>
      <div className="tabs">
        <button className={onglet === "appel" ? "on" : ""} onClick={() => setOnglet("appel")}>Faire l'appel</button>
        <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({d.seances.length})</button>
      </div>
      {onglet === "appel" ? <Appel /> : <Historique />}
    </>
  );
}

function Appel() {
  const d = useDonnees();
  const groupes = useMemo(() => ["Tous", ...Array.from(new Set(d.eleves.map((e) => e.groupe).filter(Boolean)))], [d.eleves]);
  const [groupe, setGroupe] = useState(groupes.length > 1 ? groupes[1] : "Tous");
  const [jour, setJour] = useState(versInputDate(Date.now()));
  const [heure, setHeure] = useState(() => {
    const g = d.groupes.find((x) => x.nom === groupe);
    return g?.heureDebut ?? "16:00";
  });
  const [duree, setDuree] = useState(String(d.reglages.dureeParDefautHeures));
  const [statuts, setStatuts] = useState<Record<string, Statut>>({});
  const [enregistre, setEnregistre] = useState(false);

  const eleves = d.eleves
    .filter((e) => groupe === "Tous" || e.groupe === groupe)
    .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));
  const st = (id: string): Statut => statuts[id] ?? "P";
  const nb = (s: Statut) => eleves.filter((e) => st(e.id) === s).length;
  const taux = eleves.length ? Math.round(((nb("P") + nb("R")) / eleves.length) * 100) : 0;

  const choisirGroupe = (g: string) => {
    setGroupe(g);
    setEnregistre(false);
    const cfg = d.groupes.find((x) => x.nom === g);
    if (cfg) setHeure(cfg.heureDebut);
  };

  if (d.eleves.length === 0) return <Vide icone={<ClipboardList size={48} />} texte="Ajoutez d'abord des élèves dans l'onglet Élèves." />;

  return (
    <div className="stack">
      <div className="card pad stack">
        <div className="row wrap">
          <div className="grow bold">Taux de présence : <span style={{ color: "var(--primary)" }}>{taux} %</span></div>
          <span className="badge green">P : {nb("P")}</span>
          <span className="badge red">A : {nb("A")}</span>
          <span className="badge orange">R : {nb("R")}</span>
        </div>
        <div className="fields-3">
          <Field label="Date"><input className="input" type="date" value={jour} onChange={(e) => { setJour(e.target.value); setEnregistre(false); }} /></Field>
          <Field label="Heure"><input className="input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></Field>
          <Field label="Durée (h)"><input className="input" inputMode="decimal" value={duree} onChange={(e) => setDuree(e.target.value)} /></Field>
        </div>
        {groupes.length > 1 && (
          <div className="chips">
            {groupes.map((g) => <button key={g} className={`chip ${groupe === g ? "on" : ""}`} onClick={() => choisirGroupe(g)}>{g}</button>)}
          </div>
        )}
      </div>

      <div className="list">
        {eleves.map((e) => (
          <div key={e.id} className="card item">
            <div className="grow">
              <div className="bold ellipsis">{e.prenom} {e.nom}</div>
              <div className="small muted ellipsis">{e.classe}{e.groupe && ` · ${e.groupe}`}</div>
            </div>
            <div className="statut-group">
              {(["P", "A", "R"] as Statut[]).map((s) => (
                <button key={s} title={LIBELLES[s]} className={`statut-btn ${s} ${st(e.id) === s ? "on" : ""}`}
                  onClick={() => { setStatuts({ ...statuts, [e.id]: s }); setEnregistre(false); }}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {enregistre ? (
        <div className="alert green"><CheckCircle2 size={22} /><div><div className="bold">Appel enregistré !</div><div className="small">Les compteurs de séances ont été mis à jour.</div></div></div>
      ) : (
        <button className="btn block" style={{ padding: 14 }} disabled={eleves.length === 0} onClick={() => {
          const date = combinerDateHeure(depuisInputDate(jour), heure);
          actions.enregistrerAppel(eleves.map((e) => ({
            eleveId: e.id, date, heure, dureeHeures: lireNombre(duree, d.reglages.dureeParDefautHeures),
            statut: st(e.id), commentaire: "", nomEleve: `${e.prenom} ${e.nom}`, groupe: e.groupe,
          })));
          setEnregistre(true);
          toast("Appel enregistré");
        }}>
          <CheckCircle2 size={19} />Valider l'appel ({eleves.length} élève{eleves.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}

function Historique() {
  const d = useDonnees();
  const [q, setQ] = useState("");
  const [aSupprimer, setASupprimer] = useState<Seance | null>(null);
  const liste = [...d.seances]
    .sort((a, b) => b.date - a.date)
    .filter((s) => !q || (s.nomEleve + " " + s.groupe).toLowerCase().includes(q.toLowerCase()));

  if (d.seances.length === 0) return <Vide icone={<ClipboardList size={48} />} texte="Aucune séance enregistrée." />;
  return (
    <>
      <input className="input" placeholder="Filtrer par élève ou groupe…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="list">
        {liste.slice(0, 300).map((s) => (
          <div key={s.id} className="card item">
            <div className="grow">
              <div className="bold ellipsis">{s.nomEleve}</div>
              <div className="small muted">{formatDate(s.date)} à {s.heure} · {formatDuree(s.dureeHeures)} h{s.groupe && ` · ${s.groupe}`}</div>
            </div>
            <span className={`badge ${COULEURS[s.statut]}`}>{LIBELLES[s.statut]}</span>
            <button className="icon-btn" aria-label="Supprimer" onClick={() => setASupprimer(s)}><Trash2 size={17} /></button>
          </div>
        ))}
      </div>
      {aSupprimer && (
        <Confirmation
          titre="Supprimer cette séance ?"
          message={`${aSupprimer.nomEleve} — ${formatDate(aSupprimer.date)}. Le compteur de séances de l'élève sera corrigé.`}
          onConfirm={() => actions.supprimerSeance(aSupprimer.id)}
          onClose={() => setASupprimer(null)}
        />
      )}
    </>
  );
}
