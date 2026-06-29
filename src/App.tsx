import { createElement, useEffect, useMemo, useState } from "react";

type Item = {
  slug: string;
  label: string;
  description: string;
  image: string;
  model: string;
  iosModel: string;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
  canActivateAR?: boolean;
};

const base = import.meta.env.BASE_URL;
const routeBase = "Vicaria";
const viewerId = "visionar-model-viewer";

const ITEMS: Item[] = [
  {
    slug: "img1",
    label: "Imagen 1",
    description: "Vista principal de la experiencia AR.",
    image: `${base}RepositorioImagenes/Img_1.jpg`,
    model: `${base}modelos/Img_1.glb`,
    iosModel: `${base}modelos/Img_1.usdz`,
  },
  {
    slug: "img2",
    label: "Imagen 2",
    description: "Segundo enlace dedicado con acceso directo a cámara.",
    image: `${base}RepositorioImagenes/img_2.png`,
    model: `${base}modelos/img_2.glb`,
    iosModel: `${base}modelos/img_2.usdz`,
  },
  {
    slug: "img3",
    label: "Imagen 3",
    description: "Tercer enlace independiente para compartir.",
    image: `${base}RepositorioImagenes/img_3.png`,
    model: `${base}modelos/img_3.glb`,
    iosModel: `${base}modelos/img_3.usdz`,
  },
];

function getRelativePath(pathname: string) {
  const normalizedBase = base === "/" ? "/" : base.replace(/\/?$/, "/");

  if (normalizedBase !== "/" && pathname.startsWith(normalizedBase)) {
    return pathname.slice(normalizedBase.length).replace(/^\/+/, "");
  }

  return pathname.replace(/^\/+/, "");
}

function getActiveItem(pathname: string) {
  const relative = getRelativePath(pathname).replace(/\/+$/, "");
  const match = ITEMS.find((item) => relative === `${routeBase}/${item.slug}`);

  return match ?? null;
}

function buildPublicPath(slug: string) {
  return `${base}${routeBase}/${slug}/`;
}

function buildFullUrl(slug: string) {
  return new URL(buildPublicPath(slug), window.location.origin).toString();
}

function readPathFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get("path");
  return path ? decodeURIComponent(path) : null;
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [status, setStatus] = useState("Selecciona una imagen para abrir su URL dedicada.");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const pending = readPathFromQuery();

    if (pending && pending !== window.location.pathname) {
      window.history.replaceState({}, "", pending);
      setPathname(pending);
      setStatus(`Ruta restaurada: ${new URL(pending, window.location.origin).toString()}`);
    }

    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeItem = useMemo(() => getActiveItem(pathname), [pathname]);
  const isHome = activeItem === null;
  const currentUrl = isHome
    ? new URL(base, window.location.origin).toString()
    : buildFullUrl(activeItem.slug);

  useEffect(() => {
    document.title = activeItem ? `VisionAR | ${activeItem.label}` : "VisionAR";
  }, [activeItem]);

  const goHome = () => {
    const nextPath = `${base}`;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    setStatus("Selecciona una imagen para abrir su URL dedicada.");
  };

  const openAR = async () => {
    const viewer = document.getElementById(viewerId) as ModelViewerElement | null;

    if (!viewer) {
      setStatus("No se encontró el visor AR en la página.");
      return;
    }

    setLaunching(true);
    setStatus("Solicitando apertura de cámara y modo AR...");

    try {
      if (typeof viewer.activateAR === "function") {
        await viewer.activateAR();
        setStatus(`Abriendo AR para ${activeItem?.label ?? "la imagen seleccionada"}.`);
      } else {
        setStatus("Tu navegador no expone AR desde código. Usa el botón AR integrado del visor.");
      }
    } catch {
      setStatus("No fue posible abrir AR en este navegador o dispositivo.");
    } finally {
      setLaunching(false);
    }
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("URL copiada al portapapeles.");
    } catch {
      setStatus("No se pudo copiar la URL en este navegador.");
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">VisionAR</p>
        <h1>{isHome ? "URLs listas para compartir" : activeItem?.label}</h1>
        <p className="lead">
          {isHome
            ? "Cada imagen tiene una URL pública completa para copiar y enviar al cliente."
            : "Esta URL abre una sola imagen y su botón de cámara/AR correspondiente."}
        </p>

        {!isHome ? (
          <div className="hero-actions">
            <span className="path-pill">{currentUrl}</span>
            <button type="button" className="secondary-button" onClick={goHome}>
              Ver las 3 rutas
            </button>
          </div>
        ) : null}
      </section>

      {isHome ? (
        <section className="selector" aria-label="URLs de imágenes">
          {ITEMS.map((item) => (
            <article key={item.slug} className="route-card route-card--url">
              <div className="route-card__body">
                <div>
                  <p className="route-card__label">{item.label}</p>
                  <p className="route-card__url">{buildFullUrl(item.slug)}</p>
                </div>
                <div className="route-card__actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => window.open(buildFullUrl(item.slug), "_blank", "noopener,noreferrer")}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(buildFullUrl(item.slug));
                        setStatus(`Copiada: ${buildFullUrl(item.slug)}`);
                      } catch {
                        setStatus("No se pudo copiar la URL en este navegador.");
                      }
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="status-card" aria-live="polite">
          <div>
            <p className="eyebrow">Estado</p>
            <p className="status-card__text">{status}</p>
          </div>
          <div className="badge badge--soft">Ruta activa</div>
        </section>
      )}

      {!isHome && activeItem ? (
        <section className="viewer-card" aria-label={`Vista AR de ${activeItem.label}`}>
          <div className="viewer-card__meta">
            <div>
              <p className="eyebrow">Enlace dedicado</p>
              <h2>{activeItem.label}</h2>
              <p className="viewer-card__text">{activeItem.description}</p>
            </div>
            <div className="badge">AR listo</div>
          </div>

          <div className="viewer-frame">
            {createElement("model-viewer", {
              id: viewerId,
              key: activeItem.slug,
              className: "model-viewer",
              src: activeItem.model,
              "ios-src": activeItem.iosModel,
              poster: activeItem.image,
              alt: `Modelo AR de ${activeItem.label}`,
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
            <button type="button" className="secondary-button" onClick={copyCurrentUrl}>
              Copiar / compartir esta URL
            </button>
          </div>

          <p className="note">
            Al tocar el botón principal, el navegador pedirá acceso a la cámara o abrirá Quick
            Look / Scene Viewer según el dispositivo.
          </p>
          <p className="route-card__url route-card__url--viewer">{currentUrl}</p>
        </section>
      ) : null}
    </main>
  );
}
