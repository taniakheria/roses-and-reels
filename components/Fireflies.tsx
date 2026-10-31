
"use client";

import { useEffect, useState } from "react";

type Firefly = {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
};

type FirefliesProps = {
  isBookOpen: boolean;
};

export default function Fireflies({ isBookOpen }: FirefliesProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  const fireflies: Firefly[] = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: Math.cos((i / 10) * Math.PI * 2) * (24 + (i % 3) * 9),
    y: Math.sin((i / 10) * Math.PI * 2) * (24 + (i % 3) * 9),
    delay: i * 0.17,
    size: 4 + (i % 3),
  }));

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });

      const target = event.target as HTMLElement;
      setHovering(
        Boolean(target.closest("button, a, article, [role='dialog']"))
      );
    };

    window.addEventListener("mousemove", handleMove);

    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="fireflies-layer" aria-hidden="true">
      {fireflies.map((fly) => (
        <span
          key={fly.id}
          className={`firefly ${
            hovering || isBookOpen ? "firefly-active" : ""
          } ${isBookOpen ? "firefly-lantern" : ""}`}
          style={
            {
              "--fly-x": `${fly.x}px`,
              "--fly-y": `${fly.y}px`,
              "--fly-delay": `${fly.delay}s`,
              "--fly-size": `${fly.size}px`,
              left: isBookOpen ? "50%" : `${position.x}px`,
              top: isBookOpen ? "48%" : `${position.y}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
