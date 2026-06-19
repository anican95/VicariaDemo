export type SupportState = {
  camera: boolean;
  webxr: boolean;
  secureContext: boolean;
};

type XRSystemLike = {
  isSessionSupported: (mode: "immersive-ar") => Promise<boolean>;
};

export async function detectSupport(): Promise<SupportState> {
  const secureContext = window.isSecureContext;
  const camera = Boolean(navigator.mediaDevices?.getUserMedia);
  const xr = (navigator as Navigator & { xr?: XRSystemLike }).xr;

  if (!xr || !secureContext) {
    return {
      camera,
      webxr: false,
      secureContext,
    };
  }

  try {
    const webxr = await xr.isSessionSupported("immersive-ar");
    return { camera, webxr, secureContext };
  } catch {
    return { camera, webxr: false, secureContext };
  }
}

export function getUnsupportedReason(state: SupportState): string | null {
  if (!state.secureContext) {
    return "La cámara y WebXR requieren HTTPS o localhost.";
  }

  if (!state.camera) {
    return "Este navegador no expone acceso a cámara por getUserMedia.";
  }

  return null;
}
