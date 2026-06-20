import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Élément racine #root introuvable dans le document.");
}

ReactDOM.createRoot(container).render(<App />);

// Retire l'écran de chargement une fois l'application montée.
function dismissBootSplash(): void {
  const boot = document.getElementById("boot");
  if (!boot) {
    return;
  }
  boot.classList.add("hidden");
  window.setTimeout(() => {
    boot.remove();
  }, 500);
}

if (typeof window !== "undefined") {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(dismissBootSplash);
  });
}
