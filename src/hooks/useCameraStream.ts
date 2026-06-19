import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type CameraState = {
  error: string | null;
  isStarting: boolean;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
  videoRef: RefObject<HTMLVideoElement>;
};

export function useCameraStream(): CameraState {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    if (isStarting || isActive) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite activar la cámara.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const baseConstraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setIsActive(true);
    } catch (cause) {
      const message =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Actívalo desde el navegador y vuelve a intentarlo."
          : "No se pudo abrir la cámara en este dispositivo.";
      setError(message);
      stop();
    } finally {
      setIsStarting(false);
    }
  }, [isActive, isStarting, stop]);

  useEffect(() => stop, [stop]);

  return {
    error,
    isStarting,
    isActive,
    start,
    stop,
    videoRef,
  };
}
