import { useCallback, useEffect, useState } from "react";
import { BellRing, ClipboardCheck, Home, NotebookPen, Settings, Users, Wallet, X } from "lucide-react";
import { CONFIG } from "./config";
import { elevesPaiementEnAttente, relancesAFaire, seancesDuJour, useDonnees } from "./store";
import { ToastHost } from "./components";
import Verrouillage from "./Verrouillage";
import { BoutonInstaller } from "./installation";
import { codeActif } from "./securite";
import { demarrerSynchronisation } from "./sync";
import { IndicateurSync } from "./pages/Synchro";
import Accueil from "./pages/Accueil";
import Groupes from "./pages/Groupes";
import Seances from "./pages/Seances";
import Paiements from "./pages/Paiements";
import Notes from "./pages/Notes";
import Parametres from "./pages/Parametres";

export type Page = "accueil" | "groupes" | "seances" | "paiements" | "notes" | "parametres";

const NAV: { id: Page; label: string; icon: typeof Home; mobile: boolean }[] = [
  { id: "accueil", label: "Accueil", icon: Home, mobile: true },
  { id: "groupes", label: "Groupes & élèves", icon: Users, mobile: true },
  { id: "seances", label: "Séances", icon: ClipboardCheck, mobile: true },
  { id: "paiements", label: "Paiements", icon: Wallet, mobile: true },
  { id: "notes", label: "Notes", icon: NotebookPen, mobile: false },
  { id: "parametres", label: "Paramètres", icon: Settings, mobile: false },
];

function lirePage(): Page {
  const brut = window.location.hash.replace("#", "");
  const h = (brut === "eleves" ? "groupes" : brut) as Page;
  return NAV.some((n) => n.id === h) ? h : "accueil";
}

export default function App() {
  const d = useDonnees();
  const [page, setPage] = useState<Page>(lirePage);
  const [ajoutEleve, setAjoutEleve] = useState(false);
  const [groupeOuvert, setGroupeOuvert] = useState<string | null>(null);
  const enAttente = elevesPaiementEnAttente(d).length;

  // ---------- Code d'accès ----------
  const [verrouille, setVerrouille] = useState(codeActif);
  const deverrouiller = useCallback(() => setVerrouille(false), []);
  useEffect(() => {
    const verrouiller = () => codeActif() && setVerrouille(true);
    window.addEventListener("profsuivi:verrouiller", verrouiller);
    // Re-verrouillage après 2 minutes hors de l'application
    let cache = 0;
    const visibilite = () => {
      if (document.hidden) cache = Date.now();
      else if (cache && Date.now() - cache > 2 * 60_000) verrouiller();
    };
    document.addEventListener("visibilitychange", visibilite);
    return () => {
      window.removeEventListener("profsuivi:verrouiller", verrouiller);
      document.removeEventListener("visibilitychange", visibilite);
    };
  }, []);

  // Une fois par jour : notification au professeur s'il y a des paiements à encaisser / relancer
  useEffect(() => {
    if (verrouille) return;
    const aRelancer = relancesAFaire(d);
    const cle = `profsuivi-notif-paiements-${new Date().toDateString()}`;
    try {
      if (!aRelancer.length || localStorage.getItem(cle)) return;
      localStorage.setItem(cle, "1");
    } catch { return; }
    const texte = `${aRelancer.length} élève(s) à relancer pour le paiement : ${aRelancer.map((e) => e.prenom).join(", ")}`;
    if ("Notification" in window && Notification.permission === "granted") new Notification("Paiements à encaisser", { body: texte, icon: "/icon-192.png" });
  }, [verrouille]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Rappels des séances (dans l'heure qui vient, quand l'app est ouverte) ----------
  const [maintenant, setMaintenant] = useState(Date.now());
  const [ignores, setIgnores] = useState<string[]>([]);
  useEffect(() => {
    const t = window.setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  // Rappels : cours des groupes (créneau hebdomadaire) qui commencent dans l'heure
  const rappels = seancesDuJour(d, maintenant)
    .filter((s) => !s.annulee)
    .map((s) => ({ id: s.groupe.id, nomEleve: s.groupe.nom, heure: s.heureDebut, lieu: s.groupe.lieu, date: s.debut }))
    .filter((r) => r.date > maintenant && r.date - maintenant <= 60 * 60_000 && !ignores.includes(r.id));
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    rappels.forEach((r) => {
      const cle = `profsuivi-notifie-${r.id}-${r.date}`;
      try {
        if (sessionStorage.getItem(cle)) return;
        sessionStorage.setItem(cle, "1");
      } catch { /* ignore */ }
      new Notification(`Cours à ${r.heure} : ${r.nomEleve}`, { body: `${r.lieu} · dans ${Math.round((r.date - Date.now()) / 60000)} min`, icon: "/icon-192.png" });
    });
  }, [rappels.map((r) => r.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation avec le bouton "retour" du téléphone
  useEffect(() => {
    const f = () => setPage(lirePage());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const aller = (p: Page, groupeId: string | null = null) => {
    setGroupeOuvert(groupeId);
    window.location.hash = p;
    setPage(p);
    window.scrollTo(0, 0);
  };

  // Thème (clair / sombre) et style (classique / chic)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const appliquer = () => {
      const sombre = d.reglages.theme === "sombre" || (d.reglages.theme === "auto" && mq.matches);
      const chic = d.reglages.style === "chic";
      const root = document.documentElement;
      root.dataset.theme = sombre ? "sombre" : "clair";
      root.dataset.style = chic ? "chic" : "classique";
      const couleur = chic
        ? (sombre ? CONFIG.couleurChicSombre : CONFIG.couleurChic)
        : (sombre ? CONFIG.couleurPrincipaleSombre : CONFIG.couleurPrincipale);
      root.style.setProperty("--primary", couleur);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", sombre ? (chic ? "#121212" : "#0f1115") : (chic ? "#F7F3EC" : couleur));
    };
    appliquer();
    mq.addEventListener("change", appliquer);
    return () => mq.removeEventListener("change", appliquer);
  }, [d.reglages.theme, d.reglages.style]);

  useEffect(() => {
    document.title = CONFIG.nomApp;
    demarrerSynchronisation();
  }, []);

  const contenu = (() => {
    switch (page) {
      case "accueil": return <Accueil aller={aller} ajouterEleve={() => { setAjoutEleve(true); aller("groupes"); }} ouvrirGroupe={(id) => aller("groupes", id)} />;
      case "groupes": return <Groupes groupeInitial={groupeOuvert} ajoutEleve={ajoutEleve} finAjout={() => setAjoutEleve(false)} />;
      case "seances": return <Seances />;
      case "paiements": return <Paiements />;
      case "notes": return <Notes />;
      case "parametres": return <Parametres />;
    }
  })();

  if (verrouille) return <Verrouillage onDeverrouille={deverrouiller} />;

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
        <div className="installer row" style={{ gap: 6 }}>
          <IndicateurSync onClick={() => aller("parametres")} />
          <div className="grow"><BoutonInstaller className="btn secondary block" /></div>
        </div>
      </aside>

      <header className="mobile-header">
        <img src="/icon-192.png" alt="" />
        <strong>{CONFIG.nomApp}</strong>
        <IndicateurSync onClick={() => aller("parametres")} />
        <button className="icon-btn" aria-label="Notes" onClick={() => aller("notes")} style={page === "notes" ? { color: "var(--primary)" } : undefined}>
          <NotebookPen size={20} />
        </button>
        <button className="icon-btn" aria-label="Paramètres" onClick={() => aller("parametres")} style={page === "parametres" ? { color: "var(--primary)" } : undefined}>
          <Settings size={20} />
        </button>
      </header>

      <main className="main">
        {rappels.map((r) => (
          <div key={r.id} className="rappel" role="alert">
            <BellRing size={20} />
            <div className="grow small">
              <b>Rappel :</b> cours du groupe <b>{r.nomEleve}</b> à {r.heure} (dans {Math.max(1, Math.round((r.date - maintenant) / 60000))} min) · {r.lieu}
            </div>
            <button className="icon-btn" aria-label="Masquer le rappel" onClick={() => setIgnores([...ignores, r.id])}><X size={17} /></button>
          </div>
        ))}
        {contenu}
      </main>

      <nav className="bottom-nav">
        {NAV.filter((n) => n.mobile).map((n) => (
          <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => aller(n.id)}>
            <span className="pill"><n.icon size={21} /></span>
            {n.label.split(" ")[0]}
            {n.id === "paiements" && enAttente > 0 && <span className="dot" />}
          </button>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}
