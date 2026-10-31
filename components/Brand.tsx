"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bagel_Fat_One, Instrument_Serif } from "next/font/google";

const brainFont = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
});

const bookFont = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

type BrandProps = {
  className?: string;
};

const WORD = "brainrot";
// Lowercase so letters don't visibly snap from caps when they settle
const SCRAMBLE = "abcdefghijklmnopqrstuvwxyz0123456789@#$%";

function scrambleWord(word: string, settled: number) {
  return word
    .split("")
    .map((letter, index) =>
      index < settled
        ? letter
        : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]
    )
    .join("");
}

const CSS = `
.bb-logo{
  display:inline-flex;align-items:center;gap:.35em;
  font-size:clamp(1.6rem,4.2vw,2.1rem);line-height:1;
  text-decoration:none;white-space:nowrap;
}

/* brainrot: the loud half */
.bb-brain{position:relative;display:inline-block;color:#633747;letter-spacing:-.01em}
.bb-brain-ghost{visibility:hidden}               /* reserves final width */
.bb-brain-live{position:absolute;inset:0;white-space:nowrap}
.bb-logo:hover .bb-brain-live{animation:bb-shake .4s ease-in-out}
@keyframes bb-shake{
  0%,100%{transform:translateX(0) rotate(0)}
  20%{transform:translateX(-2px) rotate(-1.5deg)}
  40%{transform:translateX(2px) rotate(1.5deg)}
  60%{transform:translateX(-1px) rotate(-1deg)}
  80%{transform:translateX(1px) rotate(1deg)}
}

/* the ribbon bookmark standing in for "&" */
.bb-ribbon{
  width:.42em;height:.78em;color:#65705c;flex:none;
  transform-origin:top center;
  opacity:0;
}
.bb-ribbon-in{
  opacity:1;
  animation:bb-drop .6s cubic-bezier(.3,1.5,.5,1) backwards,
            bb-sway 3.2s ease-in-out .6s infinite alternate;
}
@keyframes bb-drop{from{opacity:0;transform:translateY(-.6em) rotate(-12deg)}}
@keyframes bb-sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}

/* bookmarks: the calm half */
.bb-book{
  color:#b66c7c;font-size:1.2em;letter-spacing:.005em;
  opacity:0;transform:translateY(.15em);
  transition:opacity .5s ease,transform .5s ease;
}
.bb-book-visible{opacity:1;transform:none}

/* googly eyes */
.bb-eye{
  position:relative;display:inline-block;
  width:.46em;height:.46em;margin:0 .02em;
  border-radius:50%;background:#fff;
  border:.045em solid #b66c7c;
  vertical-align:-.04em;
  transition:scale .2s ease;
  animation:bb-blink 5s infinite;
}
.bb-logo:hover .bb-eye{scale:1.18}
.bb-pupil{
  position:absolute;left:50%;top:50%;
  width:.2em;height:.2em;border-radius:50%;background:#633747;
  transform:translate(calc(-50% + var(--pupil-x,0px)),calc(-50% + var(--pupil-y,0px)));
  transition:transform .08s linear;
}
@keyframes bb-blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}

.bb-logo:focus-visible{outline:2px solid #b66c7c;outline-offset:6px;border-radius:.5em}

@media (prefers-reduced-motion:reduce){
  .bb-logo *{animation:none !important;transition:none !important}
  .bb-ribbon{opacity:1}
  .bb-book{opacity:1;transform:none}
}
`;

export default function Brand({ className = "" }: BrandProps) {
  const [brainText, setBrainText] = useState("b7@!nrot");
  const [settled, setSettled] = useState(false);

  const firstEye = useRef<HTMLSpanElement>(null);
  const secondEye = useRef<HTMLSpanElement>(null);

  // "brainrot" scrambles, then locks in letter by letter
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      setBrainText(WORD);
      setSettled(true);
      return;
    }

    const totalFrames = 20;
    let frame = 0;

    setBrainText(scrambleWord(WORD, 0));

    const interval = window.setInterval(() => {
      frame++;

      setBrainText(
        scrambleWord(WORD, Math.floor((frame / totalFrames) * WORD.length))
      );

      if (frame >= totalFrames) {
        setBrainText(WORD);
        setSettled(true);
        window.clearInterval(interval);
      }
    }, 40);

    return () => window.clearInterval(interval);
  }, []);

  // Googly eyes follow the cursor (throttled with rAF)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const eyes = [firstEye.current, secondEye.current];
    let raf = 0;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        eyes.forEach((eye) => {
          if (!eye) return;

          const rect = eye.getBoundingClientRect();
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);

          const angle = Math.atan2(dy, dx);
          const movement = (Math.min(Math.hypot(dx, dy), 100) / 100) * 2.5;

          eye.style.setProperty("--pupil-x", `${Math.cos(angle) * movement}px`);
          eye.style.setProperty("--pupil-y", `${Math.sin(angle) * movement}px`);
        });
      });
    };

    const reset = () =>
      eyes.forEach((eye) => {
        eye?.style.setProperty("--pupil-x", "0px");
        eye?.style.setProperty("--pupil-y", "0px");
      });

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <Link
      href="/"
      aria-label="brainrot and bookmarks"
      className={`bb-logo ${className}`}
    >
      <style>{CSS}</style>

      {/* brainrot: invisible real word holds the width, scramble sits on top */}
      <span className={`bb-brain ${brainFont.className}`} aria-hidden="true">
        <span className="bb-brain-ghost">{WORD}</span>
        <span className="bb-brain-live">{brainText}</span>
      </span>

      {/* ribbon bookmark replaces the "&" */}
      <svg
        className={`bb-ribbon ${settled ? "bb-ribbon-in" : ""}`}
        viewBox="0 0 14 26"
        aria-hidden="true"
      >
        <path d="M1 1h12v24l-6-6-6 6z" fill="currentColor" />
      </svg>

      {/* bookmarks with googly eyes */}
      <span
        className={`bb-book ${bookFont.className} ${
          settled ? "bb-book-visible" : ""
        }`}
        aria-hidden="true"
      >
        b
        <span className="bb-eye" ref={firstEye}>
          <span className="bb-pupil" />
        </span>
        <span className="bb-eye" ref={secondEye}>
          <span className="bb-pupil" />
        </span>
        kmarks
      </span>
    </Link>
  );
}