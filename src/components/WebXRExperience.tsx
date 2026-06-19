import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type WebXRExperienceProps = {
  imageUrl: string;
  fileName: string;
  onFallback: (reason: string) => void;
  onExit: () => void;
};

type XRSystemLike = {
  isSessionSupported: (mode: "immersive-ar") => Promise<boolean>;
  requestSession: (
    mode: "immersive-ar",
    init?: {
      requiredFeatures?: string[];
      optionalFeatures?: string[];
      domOverlay?: { root: HTMLElement };
    },
  ) => Promise<any>;
};

type XRSessionLike = {
  end: () => Promise<void>;
  requestReferenceSpace: (type: string) => Promise<any>;
  requestHitTestSource?: (options: { space: any }) => Promise<any>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

export default function WebXRExperience({
  imageUrl,
  fileName,
  onFallback,
  onExit,
}: WebXRExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sessionRef = useRef<XRSessionLike | null>(null);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Inicia una sesión AR para colocar la imagen en el espacio.");

  const supportMessage = useMemo(
    () => (active ? "Sesión AR activa. Toca la pantalla para colocar la imagen." : message),
    [active, message],
  );

  useEffect(() => {
    return () => {
      void sessionRef.current?.end().catch(() => undefined);
      rendererRef.current?.setAnimationLoop(null);
      rendererRef.current?.domElement.remove();
      rendererRef.current?.dispose();
      rendererRef.current = null;
      sessionRef.current = null;
    };
  }, []);

  const cleanupSession = () => {
    const renderer = rendererRef.current;
    renderer?.setAnimationLoop(null);
    renderer?.domElement.remove();
    renderer?.dispose();
    rendererRef.current = null;
    sessionRef.current = null;
    setActive(false);
    setMessage("Sesión AR cerrada. Puedes iniciar otra vez o volver al modo cámara.");
  };

  const startSession = async () => {
    if (sessionRef.current) {
      await sessionRef.current.end().catch(() => undefined);
    }

    if (!rootRef.current) {
      return;
    }

    const xr = (navigator as Navigator & { xr?: XRSystemLike }).xr;
    if (!xr || !window.isSecureContext) {
      onFallback("WebXR no está disponible en este navegador o no se está ejecutando en un contexto seguro.");
      return;
    }

    setStarting(true);
    setMessage("Solicitando sesión AR...");

    try {
      const supported = await xr.isSessionSupported("immersive-ar");
      if (!supported) {
        onFallback("Este dispositivo no soporta WebXR immersive-ar.");
        return;
      }

      const session = (await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: rootRef.current },
      })) as XRSessionLike;

      sessionRef.current = session;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(rootRef.current.clientWidth, rootRef.current.clientHeight);
      renderer.xr.enabled = true;
      rendererRef.current = renderer;
      rootRef.current.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.25));
      const direction = new THREE.DirectionalLight(0xffffff, 1);
      direction.position.set(1, 1, 1);
      scene.add(direction);

      const texture = await loadTexture(imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = texture.image.width / texture.image.height || 1;
      const planeWidth = 0.35;
      const planeHeight = planeWidth / aspect;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeHeight),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
      );
      plane.visible = false;
      scene.add(plane);

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.07, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x7ef9ff }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      const controller = renderer.xr.getController(0);
      controller.addEventListener("select", () => {
        if (!reticle.visible) return;
        plane.position.setFromMatrixPosition(reticle.matrix);
        plane.rotation.copy(camera.rotation);
        plane.visible = true;
      });
      scene.add(controller);

      const referenceSpace = await session.requestReferenceSpace("local");
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const hitTestSource = session.requestHitTestSource
        ? await session.requestHitTestSource({ space: viewerSpace })
        : null;

      session.addEventListener("end", cleanupSession);

      const resize = () => {
        if (!rootRef.current || !rendererRef.current) {
          return;
        }
        rendererRef.current.setSize(rootRef.current.clientWidth, rootRef.current.clientHeight);
      };
      window.addEventListener("resize", resize);

      renderer.setAnimationLoop((_, frame) => {
        if (frame && hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length) {
            const pose = hitTestResults[0].getPose(referenceSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          }
        }

        renderer.render(scene, camera);
      });

      renderer.xr.setSession(session);
      setActive(true);
      setMessage("Sesión AR lista. Toca la pantalla para fijar la imagen.");

      session.addEventListener("end", () => window.removeEventListener("resize", resize));
    } catch (cause) {
      cleanupSession();
      const reason = cause instanceof Error ? cause.message : "No fue posible iniciar la sesión AR.";
      onFallback(reason);
    } finally {
      setStarting(false);
    }
  };

  const closeSession = async () => {
    await sessionRef.current?.end().catch(() => undefined);
    cleanupSession();
    onExit();
  };

  return (
    <section className="ar-panel ar-panel--xr" ref={rootRef} aria-label="Experiencia WebXR">
      <div className="ar-panel__header">
        <div>
          <p className="eyebrow">WebXR</p>
          <h2>Colocar en AR</h2>
        </div>
        <div className={`status-pill ${active ? "status-pill--ready" : ""}`}>
          {active ? "Activa" : "Lista"}
        </div>
      </div>

      <p className="status-copy" aria-live="polite">
        {supportMessage}
      </p>

      <div className="xr-start-card">
        <div className="xr-start-card__media">
          <img src={imageUrl} alt={`Vista previa de ${fileName}`} />
        </div>
        <div className="xr-start-card__content">
          <strong>{fileName}</strong>
          <p>
            Si tu dispositivo soporta WebXR, puedes colocar la imagen sobre superficies
            detectadas. Si no, VisionAR usará el modo de cámara compatible.
          </p>
          <div className="tool-row tool-row--wrap">
            <button className="button button--primary button--large" onClick={startSession}>
              {starting ? "Iniciando..." : active ? "Reiniciar sesión" : "Iniciar AR"}
            </button>
            <button className="button button--ghost" onClick={closeSession}>
              Volver
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
