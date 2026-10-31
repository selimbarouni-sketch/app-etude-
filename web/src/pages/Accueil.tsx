import { AlertTriangle, CalendarDays, CalendarPlus, ClipboardCheck, GraduationCap, UserPlus, Wallet } from "lucide-react";
import type { Page } from "../App";
import { actions, elevesPaiementEnAttente, useDonnees } from "../store";
import { toast } from "../components";
import { BoutonInstaller, estInstallee } from "../installation";
import { CONFIG } from "../config";
import { useState } from "react";
import { estAujourdhui, formatDateLongue, formatDuree, formatJourCourt, initiales, libelleCycle } from "../utils";

export default function Accueil({ aller, ajouterEleve }: { aller: (p: Page) => void; ajouterEleve: () => void }) {
  const d = useDonnees();
  const now = Date.now();
  const rdvJour = d.rendezVous.filter((r) => !r.annule && estAujourdhui(r.date, now)).sort((a, b) => a.date - b.date);
  const seancesJour = d.seances.filter((s) => estAujourdhui(s.date, now));
  const enAttente = elevesPaiementEnAttente(d);
  const limite = d.reglages.seancesParPaiement;
  const [bandeauInstall, setBandeauInstall] = useState(() => {
    try { return !estInstallee() && localStorage.getItem("profsuivi-install-masque") !== "1"; } catch { return !estInstallee(); }
  });

  const stats = [
    { label: "Élèves", value: d.eleves.length, icon: GraduationCap, color: "var(--primary)", page: "eleves" as Page },
    { label: "Séances aujourd'hui", value: seancesJour.length, icon: ClipboardCheck, color: "#0288d1", page: "seances" as Page },
    { label: "Paiements en attente", value: enAttente.length, icon: Wallet, color: enAttente.length ? "var(--red)" : "var(--green)", page: "paiements" as Page },
    { label: "Rendez-vous aujourd'hui", value: rdvJour.length, icon: CalendarDays, color: "var(--orange)", page: "agenda" as Page },
  ];

  return (
    <>
      <div className="topbar">
        <h1>
          Tableau de bord
          <div className="sub">{formatDateLongue(now)}</div>
        </h1>
        <button className="btn" onClick={ajouterEleve}><UserPlus size={18} />Ajouter un élève</button>
      </div>

      {bandeauInstall && (
        <div className="card bandeau-installation">
          <img src="/icon-192.png" alt="" />
          <div className="grow">
            <div className="bold">Installez {CONFIG.nomApp} sur votre téléphone</div>
            <div className="small muted">Une icône sur l'écran d'accueil, en plein écran, même hors connexion.</div>
          </div>
          <BoutonInstaller libelle="Installer" />
          <button className="btn ghost small" onClick={() => { setBandeauInstall(false); try { localStorage.setItem("profsuivi-install-masque", "1"); } catch { /* ignore */ } }}>Plus tard</button>
        </div>
      )}

      <div className="grid-stats">
        {stats.map((s) => (
          <button key={s.label} className="card stat" onClick={() => aller(s.page)}>
            <div className="icon" style={{ background: `color-mix(in srgb, ${s.color} 14%, transparent)`, color: s.color }}>
              <s.icon size={19} />
            </div>
            <div className="value">{s.value}</div>
            <div className="label">{s.label}</div>
          </button>
        ))}
      </div>

      {enAttente.length > 0 && (
        <div className="alert red" style={{ marginTop: 16, cursor: "pointer" }} onClick={() => aller("paiements")}>
          <AlertTriangle size={22} />
          <div className="grow">
            <div className="bold">{enAttente.length} paiement(s) attendu(s)</div>
            <div className="small">Certains élèves ont atteint leurs {limite} séances.</div>
          </div>
        </div>
      )}

      {d.groupes.length > 0 && (
        <>
          <div className="section-title"><h2>Séances de groupe</h2></div>
          <div className="card list" style={{ padding: 6, gap: 0 }}>
            {d.groupes.map((g) => (
              <div key={g.id} className="item">
                <div className="grow">
                  <div className="bold ellipsis">{g.nom}</div>
                  <div className="small muted">
                    Chaque {g.jourSemaine.toLowerCase()} à {g.heureDebut}
                    {g.prochaineSeance > now && <> · prochaine : {formatJourCourt(g.prochaineSeance)}</>}
                  </div>
                </div>
                <button
                  className="btn secondary small"
                  onClick={() => {
                    const r = actions.programmerProchaineSeance(g);
                    toast(r.dejaPresent ? "Cette séance est déjà dans l'agenda" : `Séance ajoutée à l'agenda : ${formatJourCourt(r.date)}`);
                  }}
                >
                  <CalendarPlus size={16} />Programmer
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <h2>Rendez-vous du jour</h2>
        <button className="btn ghost small" onClick={() => aller("agenda")}>Voir tout</button>
      </div>
      {rdvJour.length === 0 ? (
        <div className="card pad muted small">Aucun rendez-vous prévu aujourd'hui.</div>
      ) : (
        <div className="list">
          {rdvJour.map((r) => (
            <div key={r.id} className="card item">
              <span className="badge blue">{r.heure}</span>
              <div className="grow">
                <div className="bold ellipsis">{r.nomEleve}</div>
                <div className="small muted">{r.lieu} · {formatDuree(r.dureeHeures)} h</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">
        <h2>Mes élèves ({d.eleves.length})</h2>
        <button className="btn ghost small" onClick={() => aller("eleves")}>Voir tout</button>
      </div>
      {d.eleves.length === 0 ? (
        <div className="card pad muted small">Aucun élève pour le moment. Cliquez sur « Ajouter un élève » pour commencer.</div>
      ) : (
        <div className="list">
          {[...d.eleves].sort((a, b) => b.sessionsInCurrentCycle - a.sessionsInCurrentCycle).slice(0, 5).map((e) => (
            <div key={e.id} className="card item clickable" onClick={() => aller("eleves")}>
              <div className="avatar">{initiales(e.prenom, e.nom)}</div>
              <div className="grow">
                <div className="bold ellipsis">{e.prenom} {e.nom}</div>
                <div className="small muted ellipsis">{e.classe} · {e.groupe || "Sans groupe"}</div>
              </div>
              <span className={`badge ${e.sessionsInCurrentCycle >= limite ? "red" : "green"}`}>{libelleCycle(e.sessionsInCurrentCycle, limite)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
