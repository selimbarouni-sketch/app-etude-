import { AlertTriangle, CalendarDays, ClipboardCheck, GraduationCap, UserPlus, Users, Wallet } from "lucide-react";
import type { Page } from "../App";
import { alertesAbsences, appelDuJour, elevesPaiementEnAttente, prochainesSeances, relancesAFaire, seancesDuJour, useDonnees } from "../store";
import { RelancesPaiement } from "./Paiements";
import { AlertesAbsences } from "./Absences";
import { BoutonInstaller, estInstallee } from "../installation";
import { CONFIG } from "../config";
import { useState } from "react";
import { estAujourdhui, formatDateLongue, formatJourCourt } from "../utils";

export default function Accueil({ aller, ajouterEleve, ouvrirGroupe }: { aller: (p: Page) => void; ajouterEleve: () => void; ouvrirGroupe: (id: string) => void }) {
  const d = useDonnees();
  const now = Date.now();
  const coursDuJour = seancesDuJour(d, now);
  const seancesJour = d.seances.filter((s) => estAujourdhui(s.date, now));
  const enAttente = elevesPaiementEnAttente(d);
  const limite = d.reglages.seancesParPaiement;
  const [bandeauInstall, setBandeauInstall] = useState(() => {
    try { return !estInstallee() && localStorage.getItem("profsuivi-install-masque") !== "1"; } catch { return !estInstallee(); }
  });

  const stats = [
    { label: "Élèves", value: d.eleves.length, icon: GraduationCap, color: "var(--primary)", page: "groupes" as Page },
    { label: "Séances aujourd'hui", value: seancesJour.length, icon: ClipboardCheck, color: "#0288d1", page: "seances" as Page },
    { label: "Paiements en attente", value: enAttente.length, icon: Wallet, color: enAttente.length ? "var(--red)" : "var(--green)", page: "paiements" as Page },
    { label: "Groupes aujourd'hui", value: coursDuJour.filter((c) => !c.annulee).length, icon: CalendarDays, color: "var(--orange)", page: "seances" as Page },
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

      {alertesAbsences(d).length > 0 && <div style={{ marginTop: 16 }}><AlertesAbsences /></div>}
      {relancesAFaire(d).length > 0 && <div style={{ marginTop: 16 }}><RelancesPaiement eleves={relancesAFaire(d)} /></div>}

      <div className="section-title">
        <h2>Cours d'aujourd'hui</h2>
        <button className="btn ghost small" onClick={() => aller("groupes")}>Groupes</button>
      </div>
      {coursDuJour.length === 0 ? (
        <div className="card pad muted small">Aucun groupe n'a cours aujourd'hui.</div>
      ) : (
        <div className="list">
          {coursDuJour.map((c) => {
            const fait = appelDuJour(d, c.groupe.nom, now).length > 0;
            return (
              <div key={c.groupe.id} className="card item" style={c.annulee ? { opacity: 0.6 } : undefined}>
                <span className="badge blue">{c.heureDebut}</span>
                <div className="grow">
                  <div className="bold ellipsis" style={c.annulee ? { textDecoration: "line-through" } : undefined}>{c.groupe.nom}</div>
                  <div className="small muted">{c.heureDebut}–{c.heureFin} · {c.groupe.lieu}{c.reportDe ? " · séance reportée" : ""}</div>
                </div>
                {c.annulee ? <span className="badge red">Annulée</span>
                  : fait ? <span className="badge green">✓ Appel fait</span>
                  : <button className="btn small" onClick={() => aller("seances")}>Faire l'appel</button>}
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">
        <h2>Mes groupes ({d.groupes.length})</h2>
        <button className="btn ghost small" onClick={() => aller("groupes")}>Voir tout</button>
      </div>
      {d.groupes.length === 0 ? (
        <div className="card pad muted small">Aucun groupe pour le moment. Créez un groupe puis ajoutez-y vos élèves.</div>
      ) : (
        <div className="list">
          {d.groupes.map((g) => {
            const eleves = d.eleves.filter((e) => e.groupe.trim().toLowerCase() === g.nom.trim().toLowerCase());
            const aPayer = eleves.filter((e) => e.sessionsInCurrentCycle >= limite).length;
            const prochaine = prochainesSeances(d, now, g.id, 1)[0];
            return (
              <div key={g.id} className="card item clickable" onClick={() => ouvrirGroupe(g.id)}>
                <div className="avatar"><Users size={18} /></div>
                <div className="grow">
                  <div className="bold ellipsis">{g.nom}</div>
                  <div className="small muted ellipsis">
                    {eleves.length} élève{eleves.length > 1 ? "s" : ""}
                    {prochaine && <> · prochaine séance {formatJourCourt(prochaine.debut)} à {prochaine.heureDebut}</>}
                  </div>
                </div>
                {aPayer > 0 && <span className="badge red">{aPayer} à payer</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
