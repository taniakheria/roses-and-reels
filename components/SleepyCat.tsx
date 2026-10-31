
"use client";

import { useEffect, useState } from "react";

export default function SleepyCat() {
  const [sleeping, setSleeping] = useState(false);
  const [tailFlick, setTailFlick] = useState(false);
  const [stretching, setStretching] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let tailTimer: ReturnType<typeof setTimeout>;
    let stretchTimer: ReturnType<typeof setTimeout>;

    const resetIdle = () => {
      setSleeping(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setSleeping(true), 60_000);
    };

    const onScroll = () => {
      setTailFlick(true);
      clearTimeout(tailTimer);
      tailTimer = setTimeout(() => setTailFlick(false), 850);
      resetIdle();
    };

   const onFinishBook = () => {
  clearTimeout(idleTimer);
  clearTimeout(stretchTimer);

  setSleeping(false);
  setStretching(false);

  // Restart the stretch animation every time a book is finished
  requestAnimationFrame(() => {
    setStretching(true);
  });

  stretchTimer = setTimeout(() => {
    setStretching(false);
  }, 2200);

  idleTimer = setTimeout(() => {
    setSleeping(true);
  }, 60_000);
};

    const activityEvents = [
      "pointerdown",
      "keydown",
      "mousemove",
      "touchstart",
    ];

    activityEvents.forEach((event) =>
      window.addEventListener(event, resetIdle, { passive: true })
    );

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("book-finished", onFinishBook);

    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(tailTimer);
      clearTimeout(stretchTimer);

      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetIdle)
      );

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("book-finished", onFinishBook);
    };
  }, []);

  return (
    <div
      className={`sleepy-cat ${sleeping ? "is-sleeping" : ""} ${
        tailFlick ? "tail-flick" : ""
      } ${stretching ? "is-stretching" : ""}`}
      aria-label="A little reading companion"
      role="img"
    >
      {sleeping && <span className="sleepy-cat__z">z</span>}
      {sleeping && <span className="sleepy-cat__zz">z</span>}

      <svg viewBox="0 0 150 112" className="sleepy-cat__drawing">
        <path
          className="sleepy-cat__tail"
          d="M105 78 C137 83 139 47 119 48 C107 48 111 63 121 60"
          fill="none"
          stroke="#9b776c"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M31 77 C28 54 45 38 70 40 C94 41 112 58 108 78 C105 96 82 101 58 96 C42 93 34 88 31 77Z"
          fill="#c99f87"
        />

        <path d="M42 49 L40 23 L62 39Z" fill="#c99f87" />
        <path d="M76 39 L94 21 L96 51Z" fill="#c99f87" />
        <path d="M46 39 L45 30 L56 40Z" fill="#e9b9b0" />
        <path d="M82 39 L92 29 L90 43Z" fill="#e9b9b0" />

        <ellipse cx="67" cy="61" rx="31" ry="25" fill="#d8b49d" />

        <path
          d="M52 63 Q58 68 64 63 M76 63 Q82 68 88 63"
          stroke="#72574f"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M68 72 Q72 76 76 72"
          stroke="#9a6e68"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        <path d="M67 68 L72 70 L77 68" fill="#b77d7b" />

        <path
          d="M48 73 Q34 70 26 75 M48 78 Q34 80 27 85 M88 73 Q101 70 109 74 M88 78 Q101 80 108 85"
          stroke="#98766b"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M45 83 Q72 105 95 82"
          fill="none"
          stroke="#b78d78"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <span className="sleepy-cat__caption">
        {sleeping
          ? "sweet dreams"
          : stretching
            ? "a little stretch!"
            : "reading buddy"}
      </span>
    </div>
  );
}
