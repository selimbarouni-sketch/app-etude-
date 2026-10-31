import { useEffect, useState } from "react";
import { CalendarDays, ClipboardCheck, GraduationCap, Home, NotebookPen, Settings, Wallet } from "lucide-react";
import { CONFIG } from "./config";
import { elevesPaiementEnAttente, useDonnees } from "./store";
import { ToastHost } from "./components";
import Accueil from "./pages/Accueil";
import Eleves from "./pages/Eleves";
import Agenda from "./pages/Agenda";
import Seances from "./pages/Seances";
import Paiements from "./pages/Paiements";
import Notes from "./pages/Notes";
import Parametres from "./pages/Parametres";

export type Page = "accueil" | "eleves" | "agenda" | "seances" | "paiements" | "notes" | "parametres";

const NAV: { id: Page; label: string; icon: typeof Home; mobile: boolean }[] = [
  { id: "accueil", label: "Accueil", icon: Home, mobile: true },
  { id: "eleves", label: "Élèves", icon: GraduationCap, mobile: true },
  { id: "agenda", label: "Agenda", icon: CalendarDays, mobile: true },
  { id: "seances", label: "Séances", icon: ClipboardCheck, mobile: true },
  { id: "paiements", label: "Paiements", icon: Wallet, mobile: true },
  { id: "notes", label: "Notes", icon: NotebookPen, mobile: false },
  { id: "parametres", label: "Paramètres", icon: Settings, mobile: false },
];

function lirePage(): Page {
  const h = window.location.hash.replace("#", "") as Page;
  return NAV.some((n) => n.id === h) ? h : "accueil";
}

export default function App() {
  const d = useDonnees();
  const [page, setPage] = useState<Page>(lirePage);
  const [ajoutEleve, setAjoutEleve] = useState(false);
  const enAttente = elevesPaiementEnAttente(d).length;

  // Navigation avec le bouton "retour" du téléphone
  useEffect(() => {
    const f = () => setPage(lirePage());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const aller = (p: Page) => {
    window.location.hash = p;
    setPage(p);
    window.scrollTo(0, 0);
  };

  // Thème
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const appliquer = () => {
      const sombre = d.reglages.theme === "sombre" || (d.reglages.theme === "auto" && mq.matches);
      document.documentElement.dataset.theme = sombre ? "sombre" : "clair";
      document.documentElement.style.setProperty("--primary", sombre ? CONFIG.couleurPrincipaleSombre : CONFIG.couleurPrincipale);
    };
    appliquer();
    mq.addEventListener("change", appliquer);
    return () => mq.removeEventListener("change", appliquer);
  }, [d.reglages.theme]);

  useEffect(() => {
    document.title = CONFIG.nomApp;
  }, []);

  const contenu = (() => {
    switch (page) {
      case "accueil": return <Accueil aller={aller} ajouterEleve={() => { setAjoutEleve(true); aller("eleves"); }} />;
      case "eleves": return <Eleves ajoutInitial={ajoutEleve} finAjout={() => setAjoutEleve(false)} />;
      case "agenda": return <Agenda />;
      case "seances": return <Seances />;
      case "paiements": return <Paiements />;
      case "notes": return <Notes />;
      case "parametres": return <Parametres />;
    }
  })();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/icon-192.png" alt="" />
          <div>
            <strong>{CONFIG.nomApp}</strong>
            <span>{CONFIG.slogan}</span>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => aller(n.id)}>
            <n.icon size={19} />
            {n.label}
            {n.id === "paiements" && enAttente > 0 && <span className="count">{enAttente}</span>}
          </button>
        ))}
      </aside>

      <header className="mobile-header">
        <img src="/icon-192.png" alt="" />
        <strong>{CONFIG.nomApp}</strong>
        <button className="icon-btn" aria-label="Notes" onClick={() => aller("notes")} style={page === "notes" ? { color: "var(--primary)" } : undefined}>
          <NotebookPen size={20} />
        </button>
        <button className="icon-btn" aria-label="Paramètres" onClick={() => aller("parametres")} style={page === "parametres" ? { color: "var(--primary)" } : undefined}>
          <Settings size={20} />
        </button>
      </header>

      <main className="main">{contenu}</main>

      <nav className="bottom-nav">
        {NAV.filter((n) => n.mobile).map((n) => (
          <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => aller(n.id)}>
            <span className="pill"><n.icon size={21} /></span>
            {n.label}
            {n.id === "paiements" && enAttente > 0 && <span className="dot" />}
          </button>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}
