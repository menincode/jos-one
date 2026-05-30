import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type RandomDriftConfig = {
  rangeX: number;
  rangeY: number;
  intervalMin: number;
  intervalMax: number;
  durationMin: number;
  durationMax: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function useRandomDrift(config: RandomDriftConfig) {
  const [offset, setOffset] = useState({ x: 0, y: 0, duration: 6 });
  const [active, setActive] = useState(true);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setActive(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    let timeoutId = 0;

    const pickNext = () => {
      const {
        rangeX,
        rangeY,
        durationMin,
        durationMax,
        intervalMin,
        intervalMax,
      } = configRef.current;

      setOffset({
        x: (Math.random() * 2 - 1) * rangeX,
        y: (Math.random() * 2 - 1) * rangeY,
        duration: randomBetween(durationMin, durationMax),
      });

      timeoutId = window.setTimeout(pickNext, randomBetween(intervalMin, intervalMax));
    };

    pickNext();
    return () => window.clearTimeout(timeoutId);
  }, [active]);

  return { offset, active };
}

type FloatingOrbProps = {
  className?: string;
  gradient: string;
  rangeX?: number;
  rangeY?: number;
  intervalMin?: number;
  intervalMax?: number;
  durationMin?: number;
  durationMax?: number;
};

export function FloatingOrb({
  className,
  gradient,
  rangeX = 56,
  rangeY = 48,
  intervalMin = 2200,
  intervalMax = 5200,
  durationMin = 5,
  durationMax = 11,
}: FloatingOrbProps) {
  const { offset, active } = useRandomDrift({
    rangeX,
    rangeY,
    intervalMin,
    intervalMax,
    durationMin,
    durationMax,
  });

  return (
    <div
      className={cn("absolute rounded-full", className)}
      style={{
        background: gradient,
        transform: active
          ? `translate3d(${offset.x}px, ${offset.y}px, 0)`
          : undefined,
        transition: active
          ? `transform ${offset.duration}s ease-in-out`
          : undefined,
        willChange: active ? "transform" : undefined,
      }}
    />
  );
}
