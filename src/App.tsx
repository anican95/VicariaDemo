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

function isIOSDevice() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function buildSceneViewerIntent(modelUrl: string, fallbackUrl: string) {
  const model = encodeURIComponent(modelUrl);
  const title = encodeURIComponent("VicariaDemo - Imagen 1");
  const fallback = encodeURIComponent(fallbackUrl);
  return `intent://arvr.google.com/scene-viewer/1.0?file=${model}&mode=ar_preferred&title=${title}&link=${fallback}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
}

export default function App() {
  const [status, setStatus] = useState("Demo lista para abrir la imagen 1 en AR.");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    document.title = "VicariaDemo | Imagen 1";
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
        viewer.activateAR();
        setStatus("Intentando abrir AR para la imagen 1.");
        return;
      }

      if (isAndroidDevice()) {
        window.location.assign(buildSceneViewerIntent(image1.model, image1.url));
        setStatus("Abriendo Scene Viewer en Android.");
        return;
      }

      if (isIOSDevice()) {
        window.location.assign(image1.iosModel);
        setStatus("Abriendo Quick Look en iPhone.");
        return;
      }

      setStatus("Tu navegador no permite abrir AR desde código. Usa el botón AR del visor.");
    } catch {
      if (isAndroidDevice()) {
        window.location.assign(buildSceneViewerIntent(image1.model, image1.url));
        setStatus("Reintentando con Scene Viewer en Android.");
        return;
      }

      if (isIOSDevice()) {
        window.location.assign(image1.iosModel);
        setStatus("Reintentando con Quick Look en iPhone.");
        return;
      }

      setStatus("No fue posible abrir AR en este navegador o dispositivo.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <main className="page page--single">
      <section className="hero">
        <p className="eyebrow">VicariaDemo</p>
        <h1>Demo AR de Imagen 1</h1>
        <p className="lead">
          Usa el botón principal para abrir la experiencia AR directamente en el dispositivo.
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
            "ar-modes": "scene-viewer quick-look webxr",
            "ar-scale": "fixed",
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
            {launching ? "Abriendo AR..." : "Abrir AR"}
          </button>
        </div>

        <p className="note">
          URL directa del demo:
          <span className="route-inline">{image1.url}</span>
        </p>
      </section>
    </main>
  );
}
