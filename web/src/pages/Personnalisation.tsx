import { useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Save, Trash2 } from "lucide-react";
import { actions, useDonnees } from "../store";
import { Field, toast } from "../components";
import { PALETTE, marque, preparerLogo } from "../marque";
import { CONFIG } from "../config";

/** Paramètres > Personnalisation : nom, sous-titre, logo et couleur de l'application. */
export default function SectionPersonnalisation() {
  const d = useDonnees();
  const actuelle = d.reglages.marque ?? {};
  const [nom, setNom] = useState(actuelle.nom ?? "");
  const [slogan, setSlogan] = useState(actuelle.slogan ?? "");
  const [logo, setLogo] = useState(actuelle.logo ?? "");
  const [couleur, setCouleur] = useState(actuelle.couleur ?? "");
  const fichier = useRef<HTMLInputElement>(null);
  const apercu = marque({ ...d, reglages: { ...d.reglages, marque: { nom, slogan, logo, couleur } } });
  const modifie = nom !== (actuelle.nom ?? "") || slogan !== (actuelle.slogan ?? "") || logo !== (actuelle.logo ?? "") || couleur !== (actuelle.couleur ?? "");

  const enregistrer = (m = { nom: nom.trim(), slogan: slogan.trim(), logo, couleur }) => {
    actions.enregistrerReglages({ marque: Object.fromEntries(Object.entries(m).filter(([, v]) => v)) });
    toast("Personnalisation enregistrée");
  };

  return (
    <section className="card pad stack">
      <div className="row bold"><Palette size={18} />Personnalisation</div>

      {/* Aperçu */}
      <div className="apercu-marque" style={{ background: apercu.couleur }}>
        <img src={apercu.logo} alt="" />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="bold ellipsis" style={{ fontSize: 18 }}>{apercu.nom}</div>
          <div className="tiny ellipsis" style={{ opacity: 0.85 }}>{apercu.slogan}</div>
        </div>
      </div>

      <div className="fields-2">
        <Field label="Nom affiché"><input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder={CONFIG.nomApp} maxLength={40} /></Field>
        <Field label="Sous-titre"><input className="input" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="ex. Cours de mathématiques — M. Selim" maxLength={60} /></Field>
      </div>

      <Field label="Logo">
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn secondary small" onClick={() => fichier.current?.click()}><ImagePlus size={16} />{logo ? "Changer le logo" : "Choisir une image"}</button>
          {logo && <button className="btn ghost small" onClick={() => setLogo("")}><Trash2 size={15} />Retirer</button>}
        </div>
      </Field>
      <input ref={fichier} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        try { setLogo(await preparerLogo(f)); } catch (err) { toast((err as Error).message); }
      }} />

      <Field label="Couleur principale">
        <div className="chips">
          <button type="button" className={`chip ${!couleur ? "on" : ""}`} onClick={() => setCouleur("")}>Celle du style</button>
          {PALETTE.map((c) => (
            <button key={c.valeur} type="button" title={c.nom} aria-label={c.nom} className={`pastille ${couleur.toLowerCase() === c.valeur.toLowerCase() ? "on" : ""}`}
              style={{ background: c.valeur }} onClick={() => setCouleur(c.valeur)} />
          ))}
          <label className="pastille autre" title="Autre couleur" style={{ background: couleur && !PALETTE.some((c) => c.valeur.toLowerCase() === couleur.toLowerCase()) ? couleur : undefined }}>
            <input type="color" value={couleur || "#1565c0"} onChange={(e) => setCouleur(e.target.value)} />
            +
          </label>
        </div>
      </Field>

      <div className="fields-2">
        <button className="btn" disabled={!modifie} onClick={() => enregistrer()}><Save size={18} />Enregistrer</button>
        <button className="btn secondary" disabled={!apercu.personnalisee && !d.reglages.marque} onClick={() => {
          setNom(""); setSlogan(""); setLogo(""); setCouleur("");
          enregistrer({ nom: "", slogan: "", logo: "", couleur: "" });
        }}><RotateCcw size={17} />Par défaut</button>
      </div>
      <div className="tiny muted">S'applique partout : en-tête, écran du code, reçus et rapports PDF. Synchronisé sur vos appareils si la synchronisation en ligne est activée.</div>
    </section>
  );
}
