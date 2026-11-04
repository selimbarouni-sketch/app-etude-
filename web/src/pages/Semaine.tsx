import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { appelDuJour, seancesDuJour, useDonnees, vacancesLe } from "../store";
import { debutDuJour, estAujourdhui, formatJourCourt, JOURS } from "../utils";

/** Emploi du temps de la semaine (lundi → dimanche) : séances des groupes, reports, annulations, vacances. */
export default function Semaine() {
  const d = useDonnees();
  const lundiDe = (ms: number) => { const j = new Date(debutDuJour(ms)); j.setDate(j.getDate() - ((j.getDay() + 6) % 7)); return j.getTime(); };
  const [lundi, setLundi] = useState(() => lundiDe(Date.now()));
  const jours = Array.from({ length: 7 }, (_, i) => { const x = new Date(lundi); x.setDate(x.getDate() + i); return x.getTime(); });
  const decaler = (n: number) => { const x = new Date(lundi); x.setDate(x.getDate() + 7 * n); setLundi(x.getTime()); };
  const total = jours.reduce((s, j) => s + seancesDuJour(d, j + 3_600_000).filter((x) => !x.annulee).length, 0);
  const heures = jours.reduce((s, j) => s + seancesDuJour(d, j + 3_600_000).filter((x) => !x.annulee)
    .reduce((t, x) => { const [a, b] = x.heureDebut.split(":").map(Number); const [c, e] = x.heureFin.split(":").map(Number); return t + ((c * 60 + e) - (a * 60 + b)) / 60; }, 0), 0);

  return (
    <div className="stack">
      <div className="row">
        <button className="icon-btn" aria-label="Semaine précédente" onClick={() => decaler(-1)}><ChevronLeft size={20} /></button>
        <div className="grow" style={{ textAlign: "center" }}>
          <div className="bold">Semaine du {formatJourCourt(jours[0])} au {formatJourCourt(jours[6])}</div>
          <div className="tiny muted">{total} séance{total > 1 ? "s" : ""} · {heures.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h de cours</div>
        </div>
        <button className="icon-btn" aria-label="Semaine suivante" onClick={() => decaler(1)}><ChevronRight size={20} /></button>
      </div>
      {lundi !== lundiDe(Date.now()) && <button className="btn ghost small" style={{ alignSelf: "center" }} onClick={() => setLundi(lundiDe(Date.now()))}>Revenir à cette semaine</button>}

      <div className="semaine">
        {jours.map((j, i) => {
          const seances = seancesDuJour(d, j + 3_600_000);
          const vac = vacancesLe(d, j);
          return (
            <div key={j} className={`card jour ${estAujourdhui(j) ? "aujourdhui" : ""}`}>
              <div className="jour-titre">
                <span className="bold">{JOURS[i]}</span>
                <span className="tiny muted">{new Date(j).getDate()}/{new Date(j).getMonth() + 1}</span>
              </div>
              {vac && <span className="badge orange" style={{ alignSelf: "flex-start" }}>{vac.motif}</span>}
              {seances.length === 0 && !vac && <div className="tiny muted">Libre</div>}
              {seances.map((s) => {
                const fait = appelDuJour(d, s.groupe.nom, j + 3_600_000).length > 0;
                return (
                  <div key={s.groupe.id + s.heureDebut} className={`creneau ${s.annulee ? "annule" : ""}`}>
                    <div className="tiny bold">{s.heureDebut}–{s.heureFin}</div>
                    <div className="small ellipsis">{s.groupe.nom}</div>
                    <div className="tiny muted">
                      {s.annulee ? `Annulée${s.annulee.motif ? ` · ${s.annulee.motif}` : ""}` : s.reportDe ? "Reportée" : fait ? "✓ Appel fait" : s.groupe.lieu}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
