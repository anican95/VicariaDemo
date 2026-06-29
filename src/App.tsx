import { createElement, useEffect, useState } from "react";

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
};

const base = import.meta.env.BASE_URL;
const viewerId = "visionar-model-viewer";

const image1 = {
  label: "Imagen 1",
  description: "Demo AR funcional para el cliente.",
  image: `${base}RepositorioImagenes/Img_1.jpg`,
  model: `${base}modelos/Img_1.glb`,
  iosModel: `${base}modelos/Img_1.usdz`,
  url: new URL(`${base}Vicaria/img1/`, window.location.origin).toString(),
};

function isImageRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === `${base.replace(/\/$/, "")}/Vicaria/img1`;
}

export default function App() {
  const [status, setStatus] = useState("Demo lista para abrir la imagen 1 en AR.");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    document.title = "VisionAR | Imagen 1";
  }, []);

  const openAR = async () => {
    const viewer = document.getElementById(viewerId) as ModelViewerElement | null;

    if (!viewer) {
      setStatus("No se encontró el visor AR en la página.");
      return;
    }

    setLaunching(true);
    setStatus("Solicitando acceso a cámara y modo AR...");

    try {
      if (typeof viewer.activateAR === "function") {
        await viewer.activateAR();
        setStatus("AR abierto para la imagen 1.");
      } else {
        setStatus("Tu navegador no permite abrir AR desde código. Usa el botón AR del visor.");
      }
    } catch {
      setStatus("No fue posible abrir AR en este navegador o dispositivo.");
    } finally {
      setLaunching(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image1.url);
      setStatus(`URL copiada: ${image1.url}`);
    } catch {
      setStatus("No se pudo copiar la URL en este navegador.");
    }
  };

  const showHome = !isImageRoute(window.location.pathname);

  return (
    <main className="page page--single">
      <section className="hero">
        <p className="eyebrow">VisionAR</p>
        <h1>Demo AR de Imagen 1</h1>
        <p className="lead">
          {showHome
            ? "Abre la experiencia de la imagen 1 o usa su URL completa para compartir."
            : "Esta ruta carga directamente la experiencia AR de la imagen 1."}
        </p>
      </section>

      <section className="status-card" aria-live="polite">
        <div>
          <p className="eyebrow">Estado</p>
          <p className="status-card__text">{status}</p>
        </div>
        <div className="badge badge--soft">Demo listo</div>
      </section>

      <section className="viewer-card" aria-label="Vista AR de Imagen 1">
        <div className="viewer-card__meta">
          <div>
            <p className="eyebrow">Ruta pública</p>
            <h2>{image1.label}</h2>
            <p className="viewer-card__text">{image1.description}</p>
          </div>
          <div className="badge">AR listo</div>
        </div>

        <div className="viewer-frame">
          {createElement("model-viewer", {
            id: viewerId,
            className: "model-viewer",
            src: image1.model,
            "ios-src": image1.iosModel,
            poster: image1.image,
            alt: "Modelo AR de Imagen 1",
            ar: true,
            "ar-modes": "webxr scene-viewer quick-look",
            "camera-controls": true,
            "auto-rotate": true,
            "rotation-per-second": "20deg",
            "shadow-intensity": 1,
            loading: "eager",
            reveal: "interaction",
            "interaction-prompt": "auto",
          })}
        </div>

        <div className="viewer-actions">
          <button type="button" className="primary-button" onClick={openAR} disabled={launching}>
            {launching ? "Abriendo cámara..." : "Abrir cámara y ver en AR"}
          </button>
          <button type="button" className="secondary-button" onClick={copyUrl}>
            Copiar URL
          </button>
        </div>

        <p className="note">
          URL directa del demo: <span className="route-inline">{image1.url}</span>
        </p>
      </section>
    </main>
  );
}
