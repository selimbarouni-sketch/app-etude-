import AncienneSeance from "./AncienneSeance";
// ... (gardez vos autres imports)

export default function Seances() {
  const [onglet, setOnglet] = useState<"appel" | "semaine" | "historique" | "ancienne">("appel");
  const d = useDonnees();
  return (
    <>
      <div className="topbar">
        <h1>Séances & présences</h1>
        <button
          type="button"
          className="btn primary small"
          onClick={() => setOnglet("ancienne")}
          style={{ marginLeft: "auto" }}
        >
          <Plus size={16} /> Ancienne séance
        </button>
      </div>
      <div className="tabs">
        <button className={onglet === "appel" ? "on" : ""} onClick={() => setOnglet("appel")}>Appel du jour</button>
        <button className={onglet === "semaine" ? "on" : ""} onClick={() => setOnglet("semaine")}>Semaine</button>
        <button className={onglet === "historique" ? "on" : ""} onClick={() => setOnglet("historique")}>Historique ({d.seances.length})</button>
        <button className={onglet === "ancienne" ? "on" : ""} onClick={() => setOnglet("ancienne")}>+ Ancienne séance</button>
      </div>
      {onglet === "appel" ? (
        <Appel onOuvrirAncienne={() => setOnglet("ancienne")} />
      ) : onglet === "semaine" ? (
        <Semaine />
      ) : onglet === "ancienne" ? (
        <AncienneSeance onTermine={() => setOnglet("historique")} />
      ) : (
        <Historique onOuvrirAncienne={() => setOnglet("ancienne")} />
      )}
    </>
  );
}
