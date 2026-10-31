
"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

type Petal = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  opacity: number;
  rotation: number;
};

export default function RoseRain() {
  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: (index * 37 + 9) % 100,
        delay: -((index * 3.7) % 28),
        duration: 20 + ((index * 7) % 13),
        size: 7 + ((index * 3) % 5),
        drift: ((index * 19) % 70) - 35,
        opacity: 0.28 + ((index * 7) % 19) / 100,
        rotation: index * 31,
      })),
    []
  );

  return (
    <div className="petal-rain" aria-hidden="true">
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="petal-rain__petal"
          style={
            {
              "--petal-left": `${petal.left}%`,
              "--petal-delay": `${petal.delay}s`,
              "--petal-duration": `${petal.duration}s`,
              "--petal-size": `${petal.size}px`,
              "--petal-drift": `${petal.drift}px`,
              "--petal-opacity": petal.opacity,
              "--petal-rotation": `${petal.rotation}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
