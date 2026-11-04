import { MessageCircle, UserX } from "lucide-react";
import { actions, alertesAbsences, destinataires, useDonnees } from "../store";
import { lienWhatsapp, remplirModele } from "../utils";

/** Élèves avec plusieurs absences de suite : message au parent (ou à l'élève) en un clic. */
export function AlertesAbsences() {
  const d = useDonnees();
  const alertes = alertesAbsences(d);
  if (!alertes.length) return null;
  return (
    <div className="card pad stack" style={{ gap: 8, borderColor: "color-mix(in srgb, var(--red) 35%, var(--border))" }}>
      <div className="row bold"><UserX size={18} style={{ color: "var(--red)" }} />Absences répétées ({alertes.length})</div>
      {alertes.map(({ eleve: e, nb }) => {
        const msg = remplirModele(d.reglages.smsTemplateAbsence, { prenom: e.prenom, nom: e.nom, classe: e.classe })
          .replaceAll("{nb}", String(nb)).replaceAll("{groupe}", e.groupe);
        return (
          <div key={e.id} className="row wrap" style={{ gap: 6 }}>
            <div className="grow small"><b>{e.prenom} {e.nom}</b> <span className="muted">· {e.groupe} · {nb} absences de suite</span></div>
            {destinataires(e).map((x) => (
              <a key={x.telephone} className="btn secondary small" href={lienWhatsapp(x.telephone, msg)} target="_blank" rel="noreferrer"
                onClick={() => actions.traiterAlerteAbsence(e.id)}><MessageCircle size={14} />{x.libelle}</a>
            ))}
            <button className="btn ghost small" onClick={() => actions.traiterAlerteAbsence(e.id)}>Ignorer</button>
          </div>
        );
      })}
    </div>
  );
}
