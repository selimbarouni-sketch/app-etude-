import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Wallet } from "lucide-react";
import { lireEspaceParent } from "../sync";
import type { EspaceParentDonnees } from "../espaceParent";
import { formatDate, formatJourCourt, formatMontant } from "../utils";

const STATUT: Record<string, [string, string]> = { P: ["Présent", "green"], A: ["Absent", "red"], R: ["Retard", "orange"], J: ["Absence justifiée", "blue"] };

/** Page ouverte par le parent avec son lien privé : consultation seule, sans compte ni code. */
export default function EspaceParent({ jeton, parametre }: { jeton: string; parametre: string | null }) {
  const [donnees, setDonnees] = useState<EspaceParentDonnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    lireEspaceParent(jeton, parametre)
      .then((r) => (r ? setDonnees(r as EspaceParentDonnees) : setErreur("Ce lien n'est plus valide. Demandez un nouveau lien au professeur.")))
      .catch(() => setErreur("Impossible de charger les informations. Vérifiez votre connexion Internet et réessayez."));
  }, [jeton, parametre]);

  useEffect(() => {
    if (!donnees) return;
    document.title = `${donnees.eleve.prenom} — ${donnees.prof.nom}`;
    document.documentElement.style.setProperty("--primary", donnees.prof.couleur);
  }, [donnees]);

  if (erreur) return <div className="parent"><div className="card pad">{erreur}</div></div>;
  if (!donnees) return <div className="parent"><div className="muted">Chargement…</div></div>;
  const x = donnees;
  const total = x.stats.presents + x.stats.retards + x.stats.absents + x.stats.justifiees;
  const taux = total ? Math.round(((x.stats.presents + x.stats.retards) / total) * 100) : null;

  return (
    <div className="parent">
      <header className="parent-entete" style={{ background: x.prof.couleur }}>
        {x.prof.logo && <img src={x.prof.logo} alt="" />}
        <div>
          <div className="bold" style={{ fontSize: 18 }}>{x.prof.nom}</div>
          <div className="tiny" style={{ opacity: 0.85 }}>{x.prof.slogan}</div>
        </div>
      </header>

      <div className="card pad">
        <div className="tiny muted">Espace parents</div>
        <h1 style={{ margin: "2px 0", fontSize: 24 }}>{x.eleve.prenom} {x.eleve.nom}</h1>
        <div className="small muted">{[x.eleve.classe, x.eleve.groupe].filter(Boolean).join(" · ")}</div>
        {x.creneau && <div className="small" style={{ marginTop: 6 }}>{x.creneau}</div>}
      </div>

      <div className="grid-stats">
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Présence</div><div className="value">{taux === null ? "—" : `${taux} %`}</div></div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Moyenne</div><div className="value">{x.moyenne === null ? "—" : `${x.moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/20`}</div></div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Séances à payer</div><div className="value" style={x.paiement.seancesAPayer ? { color: "var(--red)" } : undefined}>{x.paiement.seancesAPayer}</div>
          {x.paiement.montantDu > 0 && <div className="tiny muted">{formatMontant(x.paiement.montantDu)} {x.devise}</div>}
          {x.paiement.credit > 0 && <div className="tiny muted">Crédit : {x.paiement.credit} séance(s)</div>}</div>
        <div className="card stat" style={{ cursor: "default" }}><div className="label">Absences</div><div className="value">{x.stats.absents}</div>
          {x.stats.justifiees > 0 && <div className="tiny muted">+ {x.stats.justifiees} justifiée(s)</div>}</div>
      </div>

      <Bloc titre="Prochaines séances" icone={<CalendarDays size={18} />}>
        {x.prochaines.length === 0 && <div className="small muted">Aucune séance prévue.</div>}
        {x.prochaines.map((s) => <div key={s.date} className="small">{formatJourCourt(s.date)} à {s.heure}{s.reportee ? " (séance reportée)" : ""}</div>)}
        {x.annulees.map((a) => <div key={a.date} className="small" style={{ color: "var(--red)" }}>Pas de cours le {formatJourCourt(a.date)}{a.motif ? ` — ${a.motif}` : ""}</div>)}
      </Bloc>

      <Bloc titre="Devoirs et travail en séance" icone={<BookOpen size={18} />}>
        {x.cahier.length === 0 && <div className="small muted">Rien pour le moment.</div>}
        {x.cahier.map((c) => (
          <div key={c.date} className="small" style={{ paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
            <b>{formatJourCourt(c.date)}</b>{c.chapitre && <> — {c.chapitre}</>}
            {c.devoirs && <div>📝 Devoirs{c.pourLe ? ` pour le ${formatJourCourt(c.pourLe)}` : ""} : {c.devoirs}</div>}
          </div>
        ))}
      </Bloc>

      <Bloc titre="Notes" icone={<GraduationCap size={18} />}>
        {x.notes.length === 0 && <div className="small muted">Aucune note pour le moment.</div>}
        {x.notes.map((n) => (
          <div key={n.date + n.titre} className="row small"><span className="grow">{formatDate(n.date)} · {n.titre}</span><b>{n.note.toLocaleString("fr-FR")} / {n.sur}</b></div>
        ))}
      </Bloc>

      <Bloc titre="Présences (dernières séances)" icone={<ClipboardCheck size={18} />}>
        {x.presences.length === 0 && <div className="small muted">Aucune séance pour le moment.</div>}
        {x.presences.map((p) => (
          <div key={p.date} className="row small"><span className="grow">{formatDate(p.date)} à {p.heure}</span><span className={`badge ${STATUT[p.statut]?.[1] ?? ""}`}>{STATUT[p.statut]?.[0] ?? p.statut}</span></div>
        ))}
      </Bloc>

      <Bloc titre="Paiements" icone={<Wallet size={18} />}>
        {x.paiements.length === 0 && <div className="small muted">Aucun paiement enregistré.</div>}
        {x.paiements.map((p) => (
          <div key={p.date} className="row small"><span className="grow">{formatDate(p.date)} · {p.seances} séance(s)</span><b>{formatMontant(p.montant)} {x.devise}</b></div>
        ))}
      </Bloc>

      <div className="tiny muted" style={{ textAlign: "center", margin: "16px 0 30px" }}>Mis à jour le {new Date(x.maj).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} · consultation seule</div>
    </div>
  );
}

function Bloc({ titre, icone, children }: { titre: string; icone: ReactNode; children: ReactNode }) {
  return (
    <div className="card pad stack" style={{ gap: 6 }}>
      <div className="row bold" style={{ color: "var(--primary)" }}>{icone}{titre}</div>
      {children}
    </div>
  );
}
