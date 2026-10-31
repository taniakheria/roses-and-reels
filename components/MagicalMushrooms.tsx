
"use client";

import { useEffect, useState } from "react";

export default function MagicalMushrooms() {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [growing, setGrowing] = useState(false);

  useEffect(() => {
    let growTimer: ReturnType<typeof setTimeout>;

    const handleMove = (event: MouseEvent) => {
      setPosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    const handleFinishedBook = () => {
      clearTimeout(growTimer);
      setGrowing(true);

      growTimer = setTimeout(() => {
        setGrowing(false);
      }, 2500);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("book-finished", handleFinishedBook);

    return () => {
      clearTimeout(growTimer);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("book-finished", handleFinishedBook);
    };
  }, []);

  const mushrooms = [
    { x: -25, y: 4, size: 24, delay: "0s", color: "#d99aaa" },
    { x: 12, y: -19, size: 19, delay: ".15s", color: "#c98f9c" },
    { x: 30, y: 13, size: 22, delay: ".3s", color: "#e5b6a0" },
    { x: -8, y: 28, size: 16, delay: ".45s", color: "#c6a68c" },
    { x: 0, y: -38, size: 14, delay: ".6s", color: "#d9a6b4" },
  ];

  return (
    <div className="mushroom-garden" aria-hidden="true">
      {mushrooms.map((mushroom, index) => (
        <span
          key={index}
          className={`tiny-mushroom ${growing ? "mushroom-growing" : ""}`}
          style={
            {
              left: `calc(${position.x}px + ${mushroom.x}px)`,
              top: `calc(${position.y}px + ${mushroom.y}px)`,
              "--mushroom-size": `${mushroom.size}px`,
              "--mushroom-color": mushroom.color,
              "--mushroom-delay": mushroom.delay,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 40 40" width="100%" height="100%">
            {/* Mushroom stem */}
            <path
              d="M16 21 C17 17 16 15 17 13 L24 13 C25 17 24 19 27 24 L27 29 L13 29 L13 24 Z"
              fill="#f4e5cf"
            />

            {/* Mushroom cap */}
            <path
              d="M4 20 C5 9 13 4 21 4 C30 4 37 10 38 20 C29 23 12 23 4 20Z"
              fill={mushroom.color}
            />

            {/* Little spots */}
            <circle cx="14" cy="13" r="2" fill="#fff2e5" />
            <circle cx="25" cy="9" r="2.2" fill="#fff2e5" />
            <circle cx="30" cy="17" r="1.5" fill="#fff2e5" />

            {/* Ground */}
            <path
              d="M9 30 Q20 26 31 30"
              fill="none"
              stroke="#b99b82"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
