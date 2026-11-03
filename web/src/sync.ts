/**
 * Synchronisation en ligne (Supabase) : mêmes données sur le téléphone et l'ordinateur,
 * sauvegarde automatique quotidienne côté serveur (30 dernières conservées).
 *
 * Principe : une ligne par professeur contenant toutes les données (JSON) + la date de mise à jour.
 * - modification sur l'appareil → envoi quelques secondes après ;
 * - au démarrage, toutes les minutes et au retour sur l'application → récupération si le serveur est plus récent ;
 * - conflit (modifié des deux côtés) → la version la plus récente gagne, l'autre est gardée en sauvegarde.
 */
import { useSyncExternalStore } from "react";
import { ecouterModifications, getDonnees, remplacerDepuisServeur } from "./store";

// ---------- Configuration ----------
const CLE_CONFIG = "profsuivi-supabase";
const CLE_META = "profsuivi-sync-meta";

export type ConfigServeur = { url: string; cle: string };

export function lireConfig(): ConfigServeur | null {
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) return { url: env.VITE_SUPABASE_URL, cle: env.VITE_SUPABASE_ANON_KEY };
  try {
    const c = JSON.parse(localStorage.getItem(CLE_CONFIG) || "null");
    return c?.url && c?.cle ? c : null;
  } catch {
    return null;
  }
}
export const configParEnvironnement = () => !!(import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL;
export function enregistrerConfig(c: ConfigServeur | null) {
  try {
    if (c) localStorage.setItem(CLE_CONFIG, JSON.stringify({ url: c.url.trim().replace(/\/+$/, ""), cle: c.cle.trim() }));
    else localStorage.removeItem(CLE_CONFIG);
  } catch { /* ignore */ }
  serveur = null;
}

type Meta = { versionServeur?: string; modifieLocalement?: boolean; majLocale?: number; derniereSauvegarde?: string };
const lireMeta = (): Meta => { try { return JSON.parse(localStorage.getItem(CLE_META) || "{}"); } catch { return {}; } };
const ecrireMeta = (m: Meta) => { try { localStorage.setItem(CLE_META, JSON.stringify(m)); } catch { /* ignore */ } };

// ---------- Accès au serveur ----------
export interface Sauvegarde { id: number; motif: string; cree_le: string }
interface Serveur {
  session(): Promise<string | null>; // e-mail connecté
  connexion(email: string, mdp: string): Promise<void>;
  inscription(email: string, mdp: string): Promise<"connecte" | "confirmer">;
  deconnexion(): Promise<void>;
  lire(): Promise<{ donnees: unknown; maj: string } | null>;
  ecrire(donnees: unknown, maj: string): Promise<void>;
  ajouterSauvegarde(donnees: unknown, motif: string): Promise<void>;
  listerSauvegardes(): Promise<Sauvegarde[]>;
  lireSauvegarde(id: number): Promise<unknown>;
}

const traduire = (m: string) =>
  /Invalid login credentials/i.test(m) ? "E-mail ou mot de passe incorrect."
  : /Email not confirmed/i.test(m) ? "Confirmez d'abord votre e-mail (lien reçu par e-mail)."
  : /already registered/i.test(m) ? "Un compte existe déjà avec cet e-mail : connectez-vous."
  : /Password should be at least/i.test(m) ? "Le mot de passe doit contenir au moins 6 caractères."
  : /Failed to fetch|NetworkError|network/i.test(m) ? "Pas de connexion Internet ou adresse du serveur incorrecte."
  : /relation .* does not exist|profsuivi_/i.test(m) ? "Tables absentes : exécutez le script SQL (voir le guide)."
  : m;

async function creerServeurSupabase(c: ConfigServeur): Promise<Serveur> {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(c.url, c.cle, { auth: { persistSession: true, autoRefreshToken: true } });
  const uid = async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Non connecté");
    return id;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifier = (r: { data: any; error: { message: string } | null }) => { if (r.error) throw new Error(traduire(r.error.message)); return r.data; };
  return {
    async session() { const { data } = await sb.auth.getSession(); return data.session?.user.email ?? null; },
    async connexion(email, mdp) { verifier(await sb.auth.signInWithPassword({ email, password: mdp })); },
    async inscription(email, mdp) {
      const r = verifier(await sb.auth.signUp({ email, password: mdp }));
      return r.session ? "connecte" : "confirmer";
    },
    async deconnexion() { await sb.auth.signOut(); },
    async lire() {
      const r = verifier(await sb.from("profsuivi_donnees").select("donnees, maj").eq("user_id", await uid()).maybeSingle());
      return r as { donnees: unknown; maj: string } | null;
    },
    async ecrire(donnees, maj) { verifier(await sb.from("profsuivi_donnees").upsert({ user_id: await uid(), donnees, maj })); },
    async ajouterSauvegarde(donnees, motif) {
      const id = await uid();
      verifier(await sb.from("profsuivi_sauvegardes").insert({ user_id: id, donnees, motif }));
      // On garde les 30 dernières
      const anciennes = verifier(await sb.from("profsuivi_sauvegardes").select("id").eq("user_id", id).order("cree_le", { ascending: false }).range(30, 200)) as { id: number }[];
      if (anciennes?.length) verifier(await sb.from("profsuivi_sauvegardes").delete().in("id", anciennes.map((a) => a.id)));
    },
    async listerSauvegardes() {
      return verifier(await sb.from("profsuivi_sauvegardes").select("id, motif, cree_le").eq("user_id", await uid()).order("cree_le", { ascending: false }).limit(30)) as Sauvegarde[];
    },
    async lireSauvegarde(id) {
      return (verifier(await sb.from("profsuivi_sauvegardes").select("donnees").eq("id", id).single()) as { donnees: unknown }).donnees;
    },
  };
}

/** Serveur simulé en mémoire du navigateur (adresse « memoire:// ») : utilisé pour les tests. */
function creerServeurMemoire(): Serveur {
  const K = "profsuivi-serveur-memoire";
  const lireBase = () => JSON.parse(localStorage.getItem(K) || '{"comptes":{},"session":null,"donnees":{},"sauvegardes":[]}');
  const ecrireBase = (b: unknown) => localStorage.setItem(K, JSON.stringify(b));
  const moi = () => { const b = lireBase(); if (!b.session) throw new Error("Non connecté"); return b.session as string; };
  return {
    async session() { return lireBase().session; },
    async connexion(email, mdp) { const b = lireBase(); if (b.comptes[email] !== mdp) throw new Error(traduire("Invalid login credentials")); b.session = email; ecrireBase(b); },
    async inscription(email, mdp) { const b = lireBase(); if (b.comptes[email]) throw new Error(traduire("already registered")); b.comptes[email] = mdp; b.session = email; ecrireBase(b); return "connecte"; },
    async deconnexion() { const b = lireBase(); b.session = null; ecrireBase(b); },
    async lire() { return lireBase().donnees[moi()] ?? null; },
    async ecrire(donnees, maj) { const b = lireBase(); b.donnees[moi()] = { donnees, maj }; ecrireBase(b); },
    async ajouterSauvegarde(donnees, motif) { const b = lireBase(); b.sauvegardes.unshift({ id: Date.now() + Math.random(), u: moi(), motif, cree_le: new Date().toISOString(), donnees }); b.sauvegardes = b.sauvegardes.slice(0, 30); ecrireBase(b); },
    async listerSauvegardes() { const u = moi(); return lireBase().sauvegardes.filter((x: { u: string }) => x.u === u); },
    async lireSauvegarde(id) { return lireBase().sauvegardes.find((x: { id: number }) => x.id === id)?.donnees; },
  };
}

let serveur: Serveur | null = null;
async function obtenirServeur(): Promise<Serveur | null> {
  const c = lireConfig();
  if (!c) return null;
  if (!serveur) serveur = c.url.startsWith("memoire://") ? creerServeurMemoire() : await creerServeurSupabase(c);
  return serveur;
}

// ---------- État affiché ----------
export type Statut = "non_configure" | "deconnecte" | "en_cours" | "a_jour" | "hors_ligne" | "erreur";
type EtatSync = { statut: Statut; email: string | null; derniereSync: number | null; erreur: string | null };
let etatSync: EtatSync = { statut: lireConfig() ? "deconnecte" : "non_configure", email: null, derniereSync: null, erreur: null };
const abonnes = new Set<() => void>();
const changer = (p: Partial<EtatSync>) => { etatSync = { ...etatSync, ...p }; abonnes.forEach((f) => f()); };
export const useSync = () => useSyncExternalStore((f) => { abonnes.add(f); return () => abonnes.delete(f); }, () => etatSync);

// ---------- Synchronisation ----------
let enCours: Promise<void> | null = null;

export function synchroniser(): Promise<void> {
  if (!enCours) enCours = executer().finally(() => { enCours = null; });
  return enCours;
}

async function executer() {
  const s = await obtenirServeur();
  if (!s) return changer({ statut: "non_configure" });
  if (!navigator.onLine) return changer({ statut: "hors_ligne" });
  try {
    const email = await s.session();
    if (!email) return changer({ statut: "deconnecte", email: null });
    changer({ statut: "en_cours", email, erreur: null });

    const meta = lireMeta();
    const distant = await s.lire();
    const local = getDonnees();

    if (!distant) {
      await envoyer(s, local);                                   // premier envoi
    } else if (distant.maj === meta.versionServeur) {
      if (meta.modifieLocalement) await envoyer(s, local);       // seul l'appareil a changé
    } else if (!meta.modifieLocalement || meta.versionServeur === undefined && estVide(local)) {
      appliquer(distant);                                        // seul le serveur a changé
    } else {
      // Conflit : modifié des deux côtés → la plus récente gagne, l'autre est sauvegardée
      const serveurPlusRecent = new Date(distant.maj).getTime() > (meta.majLocale ?? 0);
      if (serveurPlusRecent) {
        await s.ajouterSauvegarde(local, "conflit (version de l'appareil)");
        appliquer(distant);
      } else {
        await s.ajouterSauvegarde(distant.donnees, "conflit (version du serveur)");
        await envoyer(s, local);
      }
    }
    await sauvegardeQuotidienne(s);
    changer({ statut: "a_jour", derniereSync: Date.now() });
  } catch (e) {
    const msg = traduire((e as Error).message || String(e));
    changer({ statut: navigator.onLine ? "erreur" : "hors_ligne", erreur: msg });
  }
}

const estVide = (d: { eleves: unknown[]; paiements: unknown[]; seances: unknown[] }) => !d.eleves.length && !d.paiements.length && !d.seances.length;

async function envoyer(s: Serveur, donnees: unknown) {
  const maj = new Date().toISOString();
  await s.ecrire(donnees, maj);
  ecrireMeta({ ...lireMeta(), versionServeur: maj, modifieLocalement: false });
}

function appliquer(distant: { donnees: unknown; maj: string }) {
  remplacerDepuisServeur(distant.donnees);
  ecrireMeta({ ...lireMeta(), versionServeur: distant.maj, modifieLocalement: false });
}

async function sauvegardeQuotidienne(s: Serveur) {
  const jour = new Date().toISOString().slice(0, 10);
  const meta = lireMeta();
  if (meta.derniereSauvegarde === jour) return;
  await s.ajouterSauvegarde(getDonnees(), "quotidienne");
  ecrireMeta({ ...lireMeta(), derniereSauvegarde: jour });
}

// ---------- Compte ----------
/**
 * Connexion / création du compte.
 * Renvoie { erreur } en cas de problème, ou { choix: true } si cet appareil ET le compte contiennent
 * déjà des données différentes : l'utilisateur choisit alors lesquelles garder (choisirDonnees).
 */
export async function seConnecter(email: string, mdp: string, creer: boolean): Promise<{ erreur?: string; info?: string; choix?: boolean }> {
  try {
    const s = await obtenirServeur();
    if (!s) return { erreur: "Serveur non configuré." };
    if (creer) {
      const r = await s.inscription(email.trim(), mdp);
      if (r === "confirmer") return { info: "Compte créé : ouvrez l'e-mail de confirmation, puis revenez vous connecter ici." };
    } else {
      await s.connexion(email.trim(), mdp);
    }
    const distant = await s.lire();
    const local = getDonnees();
    if (distant && !estVide(local) && lireMeta().versionServeur !== distant.maj) {
      changer({ statut: "deconnecte", email: email.trim() });
      return { choix: true };
    }
    if (distant) appliquer(distant);
    else ecrireMeta({ ...lireMeta(), modifieLocalement: true, majLocale: Date.now() });
    await synchroniser();
    return {};
  } catch (e) {
    return { erreur: traduire((e as Error).message) };
  }
}

/** Premier branchement d'un appareil qui a déjà des données : garder celles du compte ou de l'appareil. */
export async function choisirDonnees(garder: "compte" | "appareil") {
  const s = await obtenirServeur();
  if (!s) return;
  const distant = await s.lire();
  if (garder === "compte" && distant) {
    await s.ajouterSauvegarde(getDonnees(), "données de l'appareil remplacées");
    appliquer(distant);
  } else {
    if (distant) await s.ajouterSauvegarde(distant.donnees, "données du compte remplacées");
    await envoyer(s, getDonnees());
  }
  await synchroniser();
}

export async function seDeconnecter() {
  const s = await obtenirServeur();
  await s?.deconnexion();
  ecrireMeta({});
  changer({ statut: lireConfig() ? "deconnecte" : "non_configure", email: null });
}

export async function listerSauvegardes(): Promise<Sauvegarde[]> {
  const s = await obtenirServeur();
  return s ? s.listerSauvegardes() : [];
}

export async function restaurerSauvegarde(id: number) {
  const s = await obtenirServeur();
  if (!s) return;
  await s.ajouterSauvegarde(getDonnees(), "avant restauration");
  remplacerDepuisServeur(await s.lireSauvegarde(id));
  ecrireMeta({ ...lireMeta(), modifieLocalement: true, majLocale: Date.now() });
  await synchroniser();
}

// ---------- Démarrage ----------
let demarre = false;
export function demarrerSynchronisation() {
  if (demarre) return;
  demarre = true;
  let minuteur: number | undefined;
  ecouterModifications(() => {
    ecrireMeta({ ...lireMeta(), modifieLocalement: true, majLocale: Date.now() });
    window.clearTimeout(minuteur);
    minuteur = window.setTimeout(() => synchroniser(), 2500);
  });
  window.setInterval(() => synchroniser(), 60_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) synchroniser(); });
  window.addEventListener("online", () => synchroniser());
  synchroniser();
}

/** Après une modification de la configuration (adresse du serveur). */
export function reinitialiser() {
  serveur = null;
  changer({ statut: lireConfig() ? "deconnecte" : "non_configure", erreur: null });
  synchroniser();
}
