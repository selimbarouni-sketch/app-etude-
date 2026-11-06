import { useState } from "react";
import { CheckCircle2, History, Users } from "lucide-react";
import { actions, useDonnees } from "../store";
import type { Statut } from "../types";
import { toast } from "../components";
import { notifierPaiementsAttendus } from "../notifier";

const LIBELLES: Record<Statut, string> = {
  P: "Présent",
  A: "Absent",
  R: "Retard",
  J: "Absence justifiée",
};

interface Props {
  onTermine: () => void;
}

export default function AncienneSeance({ onTermine }: Props) {
  const d = useDonnees();
  const hier = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  const avantHier = new Date(Date.now() - 2 * 864e5).toISOString().split("T")[0];
  const septJours = new Date(Date.now() - 7 * 864e5).toISOString().split("T")[0];

  const [date, setDate] = useState(hier);
  const [groupeId, setGroupeId] = useState<string>(() => (d.groupes[0] ? d.groupes[0].id : ""));
  const [heure, setHeure] = useState("14:00");
  const [duree, setDuree] = useState(2);
  const [commentaire, setCommentaire] = useState("");
  const [compter, setCompter] = useState(true);
  const [presences, setPresences] = useState<Record<string, Statut>>({});

  const grp = d.groupes.find((g) => g.id === groupeId) || d.groupes[0] || null;
  const nomGroupe = grp ? grp.nom : "";

  const elevesDuGroupe = d.eleves
    .filter((el) => nomGroupe && el.groupe.trim().toLowerCase() === nomGroupe.trim().toLowerCase())
    .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, "fr"));

  const getStatut = (id: string): Statut => presences[id] || "P";
  const setStatut = (id: string, val: Statut) => setPresences((prev) => ({ ...prev, [id]: val }));

  const seancesParPaiement = d.reglages.seancesParPaiement || 4;

  const handleEnregistrer = () => {
    if (!grp) {
      toast("Veuillez choisir un groupe.");
      return;
    }
    if (elevesDuGroupe.length === 0) {
      toast("Aucun élève dans ce groupe.");
      return;
    }
    const [h, m] = (heure || "14:00").split(":").map(Number);
    const dateObj = new Date(date + "T" + String(h).padStart(2, "0") + ":" + String(m || 0).padStart(2, "0") + ":00");
    const dateMs = !isNaN(dateObj.getTime()) ? dateObj.getTime() : Date.now();

    const seancesToAdd = elevesDuGroupe.map((el) => {
      const st = getStatut(el.id);
      const effStatut: Statut = compter ? st : st === "P" || st === "R" ? "J" : st;
      return {
        eleveId: el.id,
        nomEleve: `${el.prenom} ${el.nom}`,
        groupe: grp.nom,
        date: dateMs,
        heure: heure || "14:00",
        dureeHeures: Number(duree) || 2,
        statut: effStatut,
        commentaire: (commentaire.trim() || "Séance ancienne rattrapée") + (compter ? "" : " (non comptée)"),
      };
    });

    const alertes = actions.enregistrerAppel(seancesToAdd);
    toast(`Ancienne séance du ${date} enregistrée avec succès !`);
    if (alertes && alertes.length > 0) {
      notifierPaiementsAttendus(alertes, seancesParPaiement);
    }
    onTermine();
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card pad stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="bold row" style={{ gap: 8, fontSize: "1.1rem" }}>
            <History size={20} style={{ color: "var(--primary)" }} />
            Ajouter une ancienne séance (oubliée)
          </div>
          <button type="button" className="btn ghost small" onClick={onTermine}>
            Retour
          </button>
        </div>
        <div className="small muted">
          Saisissez une séance passée que vous aviez oublié de marquer. Le nombre de séances sera automatiquement comptabilisé chez chaque élève présent.
        </div>
      </div>

      <div className="card pad stack" style={{ gap: 12 }}>
        <div>
          <label className="small bold muted block" style={{ marginBottom: 4 }}>
            Groupe concerné *
          </label>
          <select
            className="input"
            value={grp ? grp.id : ""}
            onChange={(e) => {
              setGroupeId(e.target.value);
              setPresences({});
            }}
          >
            {d.groupes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom} ({g.jourSemaine} à {g.heureDebut})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="small bold muted block" style={{ marginBottom: 4 }}>
            Date de la séance passée *
          </label>
          <input
            type="date"
            className="input"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="row wrap" style={{ gap: 6, marginTop: 6, alignItems: "center" }}>
            <span className="tiny muted">Raccourcis :</span>
            <button
              type="button"
              className={`btn small ${date === hier ? "primary" : "ghost"}`}
              onClick={() => setDate(hier)}
            >
              Hier
            </button>
            <button
              type="button"
              className={`btn small ${date === avantHier ? "primary" : "ghost"}`}
              onClick={() => setDate(avantHier)}
            >
              Avant-hier
            </button>
            <button
              type="button"
              className={`btn small ${date === septJours ? "primary" : "ghost"}`}
              onClick={() => setDate(septJours)}
            >
              Il y a 7 jours
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="grow">
            <label className="small bold muted block" style={{ marginBottom: 4 }}>
              Heure de début
            </label>
            <input
              type="time"
              className="input"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
            />
          </div>
          <div style={{ width: 140 }}>
            <label className="small bold muted block" style={{ marginBottom: 4 }}>
              Durée (heures)
            </label>
            <input
              type="number"
              className="input"
              min={0.5}
              max={6}
              step={0.5}
              value={duree}
              onChange={(e) => setDuree(parseFloat(e.target.value) || 2)}
            />
          </div>
        </div>

        <div>
          <label className="small bold muted block" style={{ marginBottom: 4 }}>
            Notion abordée / Commentaire (optionnel)
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ex: Nombres complexes, suites..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        </div>
      </div>

      <div className="card pad stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="bold row" style={{ gap: 6 }}>
            <Users size={18} />
            Présences des élèves ({elevesDuGroupe.length})
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                const map: Record<string, Statut> = {};
                elevesDuGroupe.forEach((el) => {
                  map[el.id] = "P";
                });
                setPresences(map);
              }}
            >
              Tous présents
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                const map: Record<string, Statut> = {};
                elevesDuGroupe.forEach((el) => {
                  map[el.id] = "A";
                });
                setPresences(map);
              }}
            >
              Tous absents
            </button>
          </div>
        </div>

        {elevesDuGroupe.length === 0 ? (
          <div className="card pad muted small">Aucun élève n'est inscrit dans ce groupe.</div>
        ) : (
          <div className="list">
            {elevesDuGroupe.map((el) => {
              const currentStatut = getStatut(el.id);
              const isPresent = currentStatut === "P" || currentStatut === "R";
              const nextCount = el.sessionsInCurrentCycle + (compter && isPresent ? 1 : 0);
              const willTriggerPayment =
                compter &&
                isPresent &&
                el.sessionsInCurrentCycle < seancesParPaiement &&
                nextCount >= seancesParPaiement;

              return (
                <div
                  key={el.id}
                  className="card item row"
                  style={{ justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}
                >
                  <div className="grow">
                    <div className="bold">
                      {el.prenom} {el.nom} <span className="tiny muted">({el.classe || "Élève"})</span>
                    </div>
                    <div className="tiny muted row" style={{ gap: 8, marginTop: 2 }}>
                      <span>
                        Cycle actuel : <b>{el.sessionsInCurrentCycle}/{seancesParPaiement}</b>
                      </span>
                      {compter && isPresent && (
                        <span style={{ color: willTriggerPayment ? "var(--orange)" : "var(--green)", fontWeight: 600 }}>
                          ➔ {nextCount}/{seancesParPaiement} {willTriggerPayment ? "(Forfait complet ⚠️)" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="statut-group">
                    {(["P", "A", "R", "J"] as Statut[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={LIBELLES[c]}
                        className={`statut-btn ${c} ${currentStatut === c ? "on" : ""}`}
                        onClick={() => setStatut(el.id, c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <label
        className="card pad row"
        style={{ gap: 10, cursor: "pointer", background: "var(--card-bg, #f8fafc)" }}
      >
        <input
          type="checkbox"
          checked={compter}
          onChange={(e) => setCompter(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
        />
        <div className="grow">
          <div className="bold small">Comptabiliser dans le forfait des élèves (+1 séance aux présents)</div>
          <div className="tiny muted">
            Incrémente le nombre de séances effectuées par chaque élève présent et déclenche le rappel de paiement si le forfait est atteint.
          </div>
        </div>
      </label>

      <button
        type="button"
        className="btn primary"
        style={{ padding: "12px 18px", fontSize: "1rem", justifyContent: "center" }}
        onClick={handleEnregistrer}
      >
        <CheckCircle2 size={18} />
        Enregistrer et comptabiliser l'ancienne séance
      </button>
    </div>
  );
}
