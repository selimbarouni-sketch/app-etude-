import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, PlusSquare, Share } from "lucide-react";
import { Modal } from "./components";
import { CONFIG } from "./config";

/**
 * Installation de l'application sur le téléphone (PWA).
 * - Android / Chrome / Edge : fenêtre d'installation native du navigateur.
 * - iPhone / iPad (Safari) : pas d'installation automatique possible → explications pas à pas.
 */
type InviteInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let invite: InviteInstallation | null = null;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

export const estInstallee = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const estIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde l'invitation pour notre propre bouton
    invite = e as InviteInstallation;
    notifier();
  });
  window.addEventListener("appinstalled", () => {
    invite = null;
    notifier();
  });
  // Enregistre le service worker (nécessaire pour l'installation)
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

function useInvite() {
  return useSyncExternalStore(
    (f) => { abonnes.add(f); return () => abonnes.delete(f); },
    () => invite
  );
}

/** Bouton « Installer l'application » ; caché si l'application est déjà installée. */
export function BoutonInstaller({ className = "btn", libelle = "Installer l'application" }: { className?: string; libelle?: string }) {
  const inv = useInvite();
  const [aide, setAide] = useState(false);
  const [installee, setInstallee] = useState(estInstallee);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const f = () => setInstallee(estInstallee());
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  if (installee) return null;

  const installer = async () => {
    if (inv) {
      await inv.prompt();
      const choix = await inv.userChoice;
      if (choix.outcome === "accepted") { invite = null; notifier(); }
    } else {
      setAide(true);
    }
  };

  return (
    <>
      <button className={className} onClick={installer}><Download size={18} />{libelle}</button>
      {aide && <AideInstallation onClose={() => setAide(false)} />}
    </>
  );
}

function AideInstallation({ onClose }: { onClose: () => void }) {
  const ios = estIOS();
  return (
    <Modal titre={`Installer ${CONFIG.nomApp}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>J'ai compris</button>}>
      {ios ? (
        <ol className="etapes-installation">
          <li>Ouvrez cette page dans <b>Safari</b>.</li>
          <li>Touchez le bouton <b>Partager</b> <Share size={16} style={{ verticalAlign: "-3px" }} /> en bas de l'écran.</li>
          <li>Choisissez <b>« Sur l'écran d'accueil »</b> <PlusSquare size={16} style={{ verticalAlign: "-3px" }} />.</li>
          <li>Touchez <b>Ajouter</b> : l'icône {CONFIG.nomApp} apparaît sur votre écran d'accueil.</li>
        </ol>
      ) : (
        <ol className="etapes-installation">
          <li>Ouvrez cette page dans <b>Chrome</b> (Android) ou <b>Edge</b>.</li>
          <li>Touchez le menu <b>⋮</b> en haut à droite.</li>
          <li>Choisissez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li>
          <li>Confirmez : l'icône {CONFIG.nomApp} apparaît avec vos autres applications.</li>
        </ol>
      )}
      <div className="small muted">
        L'application s'ouvre ensuite en plein écran, comme une application classique, et fonctionne même sans connexion.
      </div>
    </Modal>
  );
}
