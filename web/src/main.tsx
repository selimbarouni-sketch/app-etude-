import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import EspaceParent from "./pages/EspaceParent";
import "./styles.css";

// Lien « espace parents » : #parent=<jeton>[&s=<serveur>] → page de consultation, sans code d'accès
const lien = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const jeton = lien.get("parent");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {jeton ? <EspaceParent jeton={jeton} parametre={lien.get("s")} /> : <App />}
  </StrictMode>
);
