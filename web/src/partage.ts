import { toast } from "./components";
import { lienWhatsapp } from "./utils";

/** Télécharge un fichier. */
export function telechargerFichier(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a"); a.href = url; a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Partage un PDF : sur téléphone, feuille de partage (WhatsApp…) avec le fichier ;
 * sinon téléchargement + ouverture de WhatsApp avec le message (fichier à joindre).
 * Renvoie true si le partage natif a abouti.
 */
export async function partagerPdf(f: File, texte: string, telephone?: string): Promise<boolean> {
  if (navigator.canShare?.({ files: [f] })) {
    try { await navigator.share({ files: [f], text: texte, title: f.name }); return true; } catch { return false; }
  }
  telechargerFichier(f);
  if (telephone) window.open(lienWhatsapp(telephone, texte), "_blank");
  toast("PDF téléchargé : joignez-le dans la conversation WhatsApp");
  return false;
}
