import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";

export type ImageTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

const DEFAULT_TRANSFORM: ImageTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

type PointerPoint = {
  x: number;
  y: number;
};

type GestureStart = {
  transform: ImageTransform;
  center: PointerPoint | null;
  distance: number | null;
  angle: number | null;
  stageRect: DOMRect | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angle(a: PointerPoint, b: PointerPoint): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function center(a: PointerPoint, b: PointerPoint): PointerPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function useImageTransform() {
  const [transform, setTransform] = useState<ImageTransform>(DEFAULT_TRANSFORM);
  const pointersRef = useRef<Map<number, PointerPoint>>(new Map());
  const gestureStartRef = useRef<GestureStart | null>(null);

  const reset = useCallback(() => setTransform(DEFAULT_TRANSFORM), []);

  const setScale = useCallback((delta: number) => {
    setTransform((current) => ({
      ...current,
      scale: clamp(current.scale + delta, 0.3, 3),
    }));
  }, []);

  const setRotation = useCallback((delta: number) => {
    setTransform((current) => ({
      ...current,
      rotation: current.rotation + delta,
    }));
  }, []);

  const setPosition = useCallback((x: number, y: number) => {
    setTransform((current) => ({
      ...current,
      x,
      y,
    }));
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length === 1) {
      gestureStartRef.current = {
        transform,
        center: pointers[0],
        distance: null,
        angle: null,
        stageRect: event.currentTarget.getBoundingClientRect(),
      };
      return;
    }

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      gestureStartRef.current = {
        transform,
        center: center(first, second),
        distance: distance(first, second),
        angle: angle(first, second),
        stageRect: event.currentTarget.getBoundingClientRect(),
      };
    }
  }, [transform]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = Array.from(pointersRef.current.values());
    const start = gestureStartRef.current;
    if (!start) {
      return;
    }

    if (pointers.length === 1 && start.center) {
      const current = pointers[0];
      const dx = current.x - start.center.x;
      const dy = current.y - start.center.y;
      setTransform({
        ...start.transform,
        x: start.transform.x + dx,
        y: start.transform.y + dy,
      });
      return;
    }

    if (pointers.length >= 2 && start.center && start.distance && start.angle !== null) {
      const [first, second] = pointers;
      const currentCenter = center(first, second);
      const currentDistance = distance(first, second);
      const currentAngle = angle(first, second);
      const scaleDelta = currentDistance / start.distance;
      const rotationDelta = currentAngle - start.angle;

      setTransform({
        x: start.transform.x + (currentCenter.x - start.center.x),
        y: start.transform.y + (currentCenter.y - start.center.y),
        scale: clamp(start.transform.scale * scaleDelta, 0.3, 3),
        rotation: start.transform.rotation + rotationDelta,
      });
    }
  }, []);

  const finishPointer = useCallback((pointerId: number) => {
    pointersRef.current.delete(pointerId);
    if (pointersRef.current.size === 0) {
      gestureStartRef.current = null;
      return;
    }

    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length === 1) {
      gestureStartRef.current = {
        transform,
        center: pointers[0],
        distance: null,
        angle: null,
        stageRect: gestureStartRef.current?.stageRect ?? null,
      };
      return;
    }

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      gestureStartRef.current = {
        transform,
        center: center(first, second),
        distance: distance(first, second),
        angle: angle(first, second),
        stageRect: gestureStartRef.current?.stageRect ?? null,
      };
    }
  }, [transform]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    finishPointer(event.pointerId);
  }, [finishPointer]);

  const transformStyle = useMemo(
    () => ({
      transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
    }),
    [transform],
  );

  return {
    transform,
    transformStyle,
    reset,
    setScale,
    setPosition,
    setRotation,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
