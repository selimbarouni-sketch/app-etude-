import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { groupeDuPaiement, prixSeance, useDonnees } from "../store";
import { formatMontant, telecharger, versCsv } from "../utils";
import { moyenneEleve } from "./Pedagogie";

const MOIS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Statistiques : recettes, impayés, présences, moyennes — par mois et par groupe. */
export default function Statistiques() {
  const d = useDonnees();
  const devise = d.reglages.devise;
  const maintenant = new Date();
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const encaisse = (p: { encaisse?: boolean }) => p.encaisse !== false;

  const stats = useMemo(() => {
    const debut = new Date(annee, 0, 1).getTime(), fin = new Date(annee + 1, 0, 1).getTime();
    const paiements = d.paiements.filter((p) => encaisse(p) && p.date >= debut && p.date < fin);
    const parMois = MOIS.map((_, m) => paiements.filter((p) => new Date(p.date).getMonth() === m).reduce((s, p) => s + p.montant, 0));
    const seances = d.seances.filter((s) => s.date >= debut && s.date < fin);
    const donnees = seances.filter((s) => s.statut === "P" || s.statut === "R");
    // une séance de groupe = un créneau (groupe + jour), pas un élève
    const creneaux = new Map<string, number>();
    seances.forEach((s) => creneaux.set(`${s.groupe}|${new Date(s.date).toDateString()}`, s.dureeHeures));
    const heures = Array.from(creneaux.values()).reduce((a, b) => a + b, 0);
    const impayes = d.eleves.reduce((s, e) => s + Math.max(0, e.sessionsInCurrentCycle) * prixSeance(d, e), 0);

    const groupes = d.groupes.map((g) => {
      const eleves = d.eleves.filter((e) => memeNom(e.groupe, g.nom));
      const recettes = paiements.filter((p) => memeNom(groupeDuPaiement(d, p), g.nom)).reduce((s, p) => s + p.montant, 0);
      const seancesG = seances.filter((s) => memeNom(s.groupe, g.nom));
      const presence = seancesG.length ? Math.round(seancesG.filter((s) => s.statut === "P" || s.statut === "R").length / seancesG.length * 100) : null;
      const evals = d.evaluations.filter((e) => memeNom(e.groupe, g.nom));
      const moyennes = eleves.map((e) => moyenneEleve(evals, e.id)).filter((m): m is number => m !== null);
      return {
        g, eleves: eleves.length, recettes, presence,
        impayes: eleves.reduce((s, e) => s + Math.max(0, e.sessionsInCurrentCycle) * prixSeance(d, e), 0),
        moyenne: moyennes.length ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length : null,
      };
    });

    const aSurveiller = d.eleves.map((e) => {
      const s = seances.filter((x) => x.eleveId === e.id);
      return { e, n: s.length, presence: s.length ? Math.round(s.filter((x) => x.statut === "P" || x.statut === "R").length / s.length * 100) : 100 };
    }).filter((x) => x.n >= 3 && x.presence < 75).sort((a, b) => a.presence - b.presence).slice(0, 8);

    return { paiements, parMois, total: parMois.reduce((a, b) => a + b, 0), donnees: donnees.length, heures, impayes, groupes, aSurveiller };
  }, [d, annee]);

  const ceMois = annee === maintenant.getFullYear() ? stats.parMois[maintenant.getMonth()] : null;

  const exporter = () => {
    const lignes: (string | number)[][] = [["Mois", "Groupe", "Nombre de paiements", `Montant (${devise})`]];
    MOIS.forEach((nomMois, m) => {
      const duMois = stats.paiements.filter((p) => new Date(p.date).getMonth() === m);
      const parGroupe = new Map<string, { n: number; t: number }>();
      duMois.forEach((p) => { const g = groupeDuPaiement(d, p) || "Sans groupe"; const x = parGroupe.get(g) ?? { n: 0, t: 0 }; parGroupe.set(g, { n: x.n + 1, t: x.t + p.montant }); });
      parGroupe.forEach((v, g) => lignes.push([`${nomMois} ${annee}`, g, v.n, formatMontant(v.t)]));
    });
    lignes.push(["Total", "", stats.paiements.length, formatMontant(stats.total)]);
    telecharger(`Recettes_${annee}.csv`, versCsv(lignes), "text/csv;charset=utf-8");
  };

  return (
    <>
      <div className="topbar">
        <h1>Statistiques</h1>
        <div className="row" style={{ gap: 2 }}>
          <button className="icon-btn" aria-label="Année précédente" onClick={() => setAnnee(annee - 1)}><ChevronLeft size={20} /></button>
          <span className="bold">{annee}</span>
          <button className="icon-btn" aria-label="Année suivante" disabled={annee >= maintenant.getFullYear()} onClick={() => setAnnee(annee + 1)}><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid-stats">
        <Tuile titre={`Encaissé en ${annee}`} valeur={`${formatMontant(stats.total)} ${devise}`} />
        {ceMois !== null && <Tuile titre={`Encaissé en ${MOIS[maintenant.getMonth()].toLowerCase()}`} valeur={`${formatMontant(ceMois)} ${devise}`} />}
        <Tuile titre="Reste à encaisser (aujourd'hui)" valeur={`${formatMontant(stats.impayes)} ${devise}`} alerte={stats.impayes > 0} />
        <Tuile titre={`Cours donnés en ${annee}`} valeur={`${stats.heures.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`} detail={`${stats.donnees} présence${stats.donnees > 1 ? "s" : ""} d'élèves`} />
      </div>

      <div className="section-title">
        <h2>Recettes par mois</h2>
        <button className="btn ghost small" onClick={exporter}><Download size={15} />Export Excel</button>
      </div>
      <Barres valeurs={stats.parMois} devise={devise} moisCourant={annee === maintenant.getFullYear() ? maintenant.getMonth() : -1} />

      <div className="section-title"><h2>Par groupe</h2></div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="tableau">
          <thead><tr><th>Groupe</th><th>Élèves</th><th>Encaissé {annee}</th><th>Reste dû</th><th>Présence</th><th>Moyenne</th></tr></thead>
          <tbody>
            {stats.groupes.map((x) => (
              <tr key={x.g.id}>
                <td className="bold">{x.g.nom}</td>
                <td>{x.eleves}{x.g.capacite ? ` / ${x.g.capacite}` : ""}</td>
                <td>{formatMontant(x.recettes)} {devise}</td>
                <td style={x.impayes ? { color: "var(--red)" } : undefined}>{formatMontant(x.impayes)} {devise}</td>
                <td>{x.presence === null ? "—" : `${x.presence} %`}</td>
                <td>{x.moyenne === null ? "—" : `${x.moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 20`}</td>
              </tr>
            ))}
            {stats.groupes.length === 0 && <tr><td colSpan={6} className="muted">Aucun groupe.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="section-title"><h2>Élèves à surveiller (présence &lt; 75 %)</h2></div>
      {stats.aSurveiller.length === 0 ? <div className="card pad small muted">Aucun élève avec une présence inférieure à 75 % (sur au moins 3 séances).</div> : (
        <div className="list">
          {stats.aSurveiller.map(({ e, n, presence }) => (
            <div key={e.id} className="card item">
              <div className="grow"><div className="bold">{e.prenom} {e.nom}</div><div className="tiny muted">{e.groupe} · {n} séances</div></div>
              <span className="badge red">{presence} %</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Tuile({ titre, valeur, detail, alerte }: { titre: string; valeur: string; detail?: string; alerte?: boolean }) {
  return (
    <div className="card stat" style={{ cursor: "default" }}>
      <div className="label">{titre}</div>
      <div className="value money" style={alerte ? { color: "var(--red)" } : undefined}>{valeur}</div>
      {detail && <div className="tiny muted">{detail}</div>}
    </div>
  );
}

/** Barres verticales (une seule série) avec valeur au survol et tableau consultable. */
function Barres({ valeurs, devise, moisCourant }: { valeurs: number[]; devise: string; moisCourant: number }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const [tableau, setTableau] = useState(false);
  const max = Math.max(...valeurs, 1);
  const H = 180;
  return (
    <div className="card pad">
      <div className="barres" role="img" aria-label="Recettes encaissées par mois" onMouseLeave={() => setSurvol(null)}>
        {/* lignes de repère discrètes */}
        {valeurs.some((v) => v > 0)
          ? [0.5, 1].map((t) => <div key={t} className="repere" style={{ bottom: 22 + t * H }}><span>{formatMontant(max * t)}</span></div>)
          : <div className="repere small muted" style={{ bottom: 22 + H / 2, border: 0, textAlign: "center" }}>Aucune recette cette année</div>}
        {valeurs.map((v, i) => (
          <div key={i} className="colonne" onMouseEnter={() => setSurvol(i)} onClick={() => setSurvol(i)}>
            {survol === i && <div className="infobulle"><b>{MOIS[i]}</b><br />{formatMontant(v)} {devise}</div>}
            <div className="barre" style={{ height: Math.max(v > 0 ? 3 : 0, (v / max) * H), opacity: survol === null || survol === i ? 1 : 0.55, outline: i === moisCourant ? "2px solid var(--primary-soft)" : undefined }} />
            <div className={`tiny ${i === moisCourant ? "bold" : "muted"}`}>{MOIS[i].replace(".", "")}</div>
          </div>
        ))}
      </div>
      <button className="btn ghost small" onClick={() => setTableau(!tableau)}>{tableau ? "Masquer le tableau" : "Voir le tableau"}</button>
      {tableau && (
        <table className="tableau">
          <tbody>{valeurs.map((v, i) => <tr key={i}><td>{MOIS[i]}</td><td>{formatMontant(v)} {devise}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
