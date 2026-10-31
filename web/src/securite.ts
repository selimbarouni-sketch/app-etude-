/**
 * Code d'accès à l'application (1234 par défaut).
 * Seule l'empreinte SHA-256 du code est enregistrée, dans ce navigateur.
 * Il protège contre un accès rapide par quelqu'un d'autre sur l'appareil ;
 * les données restent dans le navigateur (ce n'est pas un chiffrement).
 */
const CLE = "profsuivi-securite";
export const CODE_PAR_DEFAUT = "1234";

type Etat = { hash?: string; actif?: boolean };

function lire(): Etat {
  try {
    return JSON.parse(localStorage.getItem(CLE) || "{}");
  } catch {
    return {};
  }
}
function ecrire(e: Etat) {
  try {
    localStorage.setItem(CLE, JSON.stringify(e));
  } catch {
    /* stockage indisponible */
  }
}

async function empreinte(code: string): Promise<string> {
  const texte = `profsuivi:${code}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Repli (page non sécurisée) : empreinte simple
  let h = 5381;
  for (const c of texte) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return "djb2-" + (h >>> 0).toString(16);
}

export const codeActif = () => lire().actif !== false;
export const codeParDefaut = () => !lire().hash;
export const codeValide = (c: string) => /^\d{4,8}$/.test(c);

export async function verifierCode(code: string): Promise<boolean> {
  const e = lire();
  return (await empreinte(code)) === (e.hash ?? (await empreinte(CODE_PAR_DEFAUT)));
}

export async function changerCode(nouveau: string) {
  ecrire({ ...lire(), hash: await empreinte(nouveau) });
}

export function activerCode(actif: boolean) {
  ecrire({ ...lire(), actif });
}
