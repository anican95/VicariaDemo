import { createElement, useMemo, useState } from "react";

type Item = {
  id: string;
  label: string;
  description: string;
  image: string;
  model: string;
  iosModel: string;
};

const base = import.meta.env.BASE_URL;

const ITEMS: Item[] = [
  {
    id: "img-1",
    label: "Imagen 1",
    description: "Retrato limpio con contraste alto",
    image: `${base}RepositorioImagenes/Img_1.png`,
    model: `${base}modelos/Img_1.glb`,
    iosModel: `${base}modelos/Img_1.usdz`,
  },
  {
    id: "img-2",
    label: "Imagen 2",
    description: "Composición cálida con fondo claro",
    image: `${base}RepositorioImagenes/img_2.png`,
    model: `${base}modelos/img_2.glb`,
    iosModel: `${base}modelos/img_2.usdz`,
  },
  {
    id: "img-3",
    label: "Imagen 3",
    description: "Imagen de alto detalle para AR",
    image: `${base}RepositorioImagenes/img_3.png`,
    model: `${base}modelos/img_3.glb`,
    iosModel: `${base}modelos/img_3.usdz`,
  },
];

export default function App() {
  const [selectedId, setSelectedId] = useState(ITEMS[0].id);

  const selected = useMemo(
    () => ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0],
    [selectedId],
  );

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">VisionAR</p>
        <h1>Visor AR estático con model-viewer</h1>
        <p className="lead">
          Selecciona una de las 3 imágenes precargadas para abrir su modelo AR en Android,
          iPhone o navegador compatible.
        </p>
      </section>

      <section className="selector" aria-label="Selector de imágenes">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`image-button ${item.id === selectedId ? "image-button--active" : ""}`}
            onClick={() => setSelectedId(item.id)}
            aria-pressed={item.id === selectedId}
          >
            <img src={item.image} alt="" className="image-button__thumb" />
            <span className="image-button__content">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="viewer-card" aria-label="Vista AR">
        <div className="viewer-card__meta">
          <div>
            <p className="eyebrow">Selección activa</p>
            <h2>{selected.label}</h2>
            <p className="viewer-card__text">{selected.description}</p>
          </div>
          <div className="badge">AR listo</div>
        </div>

        <div className="viewer-frame">
          {createElement("model-viewer", {
            key: selected.id,
            className: "model-viewer",
            src: selected.model,
            "ios-src": selected.iosModel,
            poster: selected.image,
            alt: `Modelo AR de ${selected.label}`,
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

        <p className="note">
          Usa el botón AR integrado del visor para abrir la experiencia nativa del navegador o
          Quick Look en iPhone.
        </p>
      </section>
    </main>
  );
}
