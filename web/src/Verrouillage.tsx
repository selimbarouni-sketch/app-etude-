import { useEffect, useState } from "react";
import { Delete, Lock } from "lucide-react";
import { marque } from "./marque";
import { codeParDefaut, verifierCode } from "./securite";

export default function Verrouillage({ onDeverrouille }: { onDeverrouille: () => void }) {
  const m = marque();
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(false);

  // Déverrouillage automatique dès que le bon code est tapé
  useEffect(() => {
    if (code.length >= 4) verifierCode(code).then((ok) => ok && onDeverrouille());
  }, [code, onDeverrouille]);

  const valider = async () => {
    if (code.length < 4) return;
    if (await verifierCode(code)) onDeverrouille();
    else { setErreur(true); setCode(""); }
  };

  const touche = (t: string) => {
    setErreur(false);
    if (t === "⌫") setCode((c) => c.slice(0, -1));
    else if (t === "OK") valider();
    else setCode((c) => (c.length < 8 ? c + t : c));
  };

  // Clavier physique
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) touche(e.key);
      else if (e.key === "Backspace") touche("⌫");
      else if (e.key === "Enter") touche("OK");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <div className="verrou">
      <img src={m.logo} alt="" className="verrou-logo" />
      <h1 className="verrou-titre">{m.nom}</h1>
      <div className="row muted small" style={{ gap: 6 }}><Lock size={15} />Saisissez votre code d'accès</div>
      <div className={`verrou-points ${erreur ? "erreur" : ""}`}>
        {Array.from({ length: Math.max(4, code.length) }).map((_, i) => <span key={i} className={i < code.length ? "plein" : ""} />)}
      </div>
      <div className="small" style={{ minHeight: 20, color: erreur ? "var(--red)" : "var(--muted)" }}>
        {erreur ? "Code incorrect, réessayez." : codeParDefaut() ? "Code par défaut : 1234 (modifiable dans Paramètres)" : ""}
      </div>
      <div className="verrou-clavier">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((t) => (
          <button key={t} onClick={() => touche(t)} disabled={t === "OK" && code.length < 4} aria-label={t === "⌫" ? "Effacer" : t}>
            {t === "⌫" ? <Delete size={22} /> : t}
          </button>
        ))}
      </div>
    </div>
  );
}
