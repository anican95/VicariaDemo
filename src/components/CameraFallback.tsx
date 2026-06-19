import { useEffect, useMemo, useRef } from "react";
import { useCameraStream } from "../hooks/useCameraStream";
import { useImageTransform } from "../hooks/useImageTransform";

type CameraFallbackProps = {
  imageUrl: string;
  fileName: string;
  onResetAll: () => void;
};

export default function CameraFallback({
  imageUrl,
  fileName,
  onResetAll,
}: CameraFallbackProps) {
  const { error, isStarting, isActive, start, stop, videoRef } = useCameraStream();
  const {
    transformStyle,
    reset,
    setScale,
    setRotation,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useImageTransform();

  const status = useMemo(() => {
    if (error) return error;
    if (isStarting) return "Abriendo la cámara...";
    if (isActive) return "Cámara activa. Usa gestos para mover, escalar y rotar la imagen.";
    return "Pulsa para abrir la cámara y entrar en la vista AR.";
  }, [error, isActive, isStarting]);

  const autoStartAttempted = useRef(false);

  useEffect(() => {
    if (autoStartAttempted.current) {
      return;
    }
    autoStartAttempted.current = true;
    void start();
  }, [start]);

  return (
    <section className="ar-panel" aria-label="Experiencia AR con cámara">
      <div className="ar-panel__header">
        <div>
          <p className="eyebrow">Experiencia móvil</p>
          <h2>AR con cámara</h2>
        </div>
        <div className={`status-pill ${isActive ? "status-pill--ready" : ""}`}>
          {isActive ? "Activa" : "Inactiva"}
        </div>
      </div>

      <p className="status-copy" aria-live="polite">
        {status}
      </p>

      <div className="camera-shell">
        <video
          ref={videoRef}
          className="camera-shell__video"
          playsInline
          muted
          autoPlay
        />

        {!isActive && (
          <div className="camera-shell__empty">
            <div className="camera-shell__badge">VisionAR</div>
            <p>Activa la cámara para superponer tu imagen sobre el entorno real.</p>
            <button className="button button--primary button--large" onClick={start}>
              {isStarting ? "Abriendo..." : "Abrir cámara"}
            </button>
          </div>
        )}

        {isActive && (
          <div
            className="camera-shell__stage"
            aria-label="Lienzo AR"
          >
            <div className="camera-shell__grid" aria-hidden="true" />
            <div
              className="camera-shell__image-wrap"
              style={transformStyle}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <img
                src={imageUrl}
                alt={`Imagen cargada: ${fileName}`}
                className="camera-shell__image"
                draggable={false}
              />
              <div className="camera-shell__label">{fileName}</div>
            </div>
          </div>
        )}
      </div>

      <div className="tool-row" aria-label="Controles AR">
        <button className="button button--secondary" onClick={() => setScale(0.1)}>
          Escalar +
        </button>
        <button className="button button--secondary" onClick={() => setScale(-0.1)}>
          Escalar -
        </button>
        <button className="button button--secondary" onClick={() => setRotation(10)}>
          Rotar
        </button>
        <button className="button button--secondary" onClick={reset}>
          Recentrar
        </button>
      </div>

      <div className="tool-row tool-row--actions">
        <button className="button button--ghost" onClick={stop}>
          Cerrar cámara
        </button>
        <button className="button button--ghost" onClick={onResetAll}>
          Reiniciar todo
        </button>
      </div>
    </section>
  );
}
