import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ titre, onClose, children, footer }: { titre: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titre}>
        <header>
          <h3>{titre}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirmation({
  titre, message, libelle = "Supprimer", onConfirm, onClose,
}: { titre: string; message: ReactNode; libelle?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      titre={titre}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>Annuler</button>
          <button className="btn danger" onClick={() => { onConfirm(); onClose(); }}>{libelle}</button>
        </>
      }
    >
      <div className="muted">{message}</div>
    </Modal>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Vide({ icone, texte, action }: { icone: ReactNode; texte: string; action?: ReactNode }) {
  return (
    <div className="empty card">
      {icone}
      <div>{texte}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ---------- Toast global ----------
let afficher: (m: string) => void = () => {};
export const toast = (m: string) => afficher(m);

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    afficher = (m) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2800);
    };
    return () => window.clearTimeout(t);
  }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

/** Action sensible : demande le code d'accès avant d'exécuter onValide. */
export function DemandeCode({
  titre, message, libelle = "Confirmer", onValide, onClose,
}: { titre: string; message: ReactNode; libelle?: string; onValide: () => void; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState(false);
  const valider = async () => {
    const { verifierCode } = await import("./securite");
    if (await verifierCode(code)) { onValide(); onClose(); } else { setErreur(true); setCode(""); }
  };
  return (
    <Modal titre={titre} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn danger" disabled={code.length < 4} onClick={valider}>{libelle}</button></>}>
      <div className="muted">{message}</div>
      <Field label="Code d'accès">
        <input className="input" type="password" inputMode="numeric" autoComplete="off" autoFocus value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 8)); setErreur(false); }}
          onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && valider()} />
      </Field>
      {erreur && <div className="small" style={{ color: "var(--red)" }}>Code incorrect.</div>}
    </Modal>
  );
}
