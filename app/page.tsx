"use client";


import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";

import Brand from "@/components/Brand";

// Flying popcorn: each kernel launches sideways (--dx), rises to --peak,
// spins (--rot) and drops back into the bucket.
const FLYING_KERNELS = [
  { dx: "-62px", peak: "-78px", rot: "-220deg", delay: "0s" },
  { dx: "48px", peak: "-92px", rot: "260deg", delay: ".25s" },
  { dx: "-24px", peak: "-104px", rot: "180deg", delay: ".55s" },
  { dx: "70px", peak: "-66px", rot: "-240deg", delay: ".8s" },
  { dx: "10px", peak: "-118px", rot: "300deg", delay: "1.05s" },
];

// Words and symbols that float up out of the book on hover:
// (gx, gy) is where each one drifts to, gr is how far it spins.
const BOOK_GLYPHS = [
  { text: "✦", x: 112, gx: "-38px", gy: "-62px", gr: "-25deg", delay: "0s", color: "#d4a85a", size: 16 },
  { text: "♡", x: 148, gx: "34px", gy: "-70px", gr: "18deg", delay: ".4s", color: "#b66c7c", size: 16 },
  { text: "fr", x: 126, gx: "-14px", gy: "-78px", gr: "-10deg", delay: ".8s", color: "#65705c", size: 15 },
  { text: "omg", x: 138, gx: "46px", gy: "-52px", gr: "14deg", delay: "1.2s", color: "#b66c7c", size: 14 },
  { text: "?!", x: 120, gx: "-52px", gy: "-46px", gr: "-18deg", delay: "1.6s", color: "#d4a85a", size: 15 },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#faf5ed] px-5 pb-8 pt-6 text-[#633747] sm:px-8 sm:pt-10">
      <style jsx global>{`
        /* ---------- POPCORN ---------- */

        /* Resting state: kernels breathe gently */
        @keyframes kernel-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-2.5px) rotate(1.5deg); }
        }

        /* Every few seconds one kernel pops up on its own */
        @keyframes kernel-idle-pop {
          0%, 58%, 100% { transform: translateY(0) rotate(0deg); }
          65% { transform: translateY(-24px) rotate(-14deg); }
          71% { transform: translateY(-4px) rotate(8deg); }
          76% { transform: translateY(-9px) rotate(-4deg); }
          83% { transform: translateY(0) rotate(0deg); }
        }

        /* Hover: kernels jump like the machine is going */
        @keyframes kernel-pop {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          40% { transform: translateY(-17px) rotate(-12deg); }
          70% { transform: translateY(-5px) rotate(9deg); }
        }

        @keyframes bucket-wiggle {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-3deg); }
          70% { transform: rotate(3deg); }
        }

        /* Hover: extra kernels fly out and fall back in */
        @keyframes kernel-fly {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(.4) rotate(0deg);
            animation-timing-function: cubic-bezier(.2, .8, .4, 1);
          }
          12% { opacity: 1; }
          45% {
            opacity: 1;
            transform: translate(calc(var(--dx) * .6), var(--peak)) scale(1)
              rotate(calc(var(--rot) * .5));
            animation-timing-function: cubic-bezier(.5, 0, .9, .6);
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), 42px) scale(.9) rotate(var(--rot));
          }
        }

        @keyframes pop-text {
          0% { opacity: 0; transform: translateY(8px) rotate(-8deg) scale(.6); }
          15% { opacity: 1; transform: translateY(0) rotate(-8deg) scale(1.1); }
          60% { opacity: 1; transform: translateY(-4px) rotate(-8deg) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) rotate(-8deg) scale(1); }
        }

        @keyframes sparkle-twinkle {
          0%, 100% { opacity: .45; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .pop-kernel,
        .fly-kernel,
        .pop-text,
        .corn-sparkle,
        .pop-bucket {
          transform-box: fill-box;
          transform-origin: center;
        }

        .pop-kernel {
          animation: kernel-bob 3.2s ease-in-out infinite;
        }

        .pop-kernel:nth-child(2) {
          animation: kernel-idle-pop 7s ease-in-out 1.5s infinite;
        }

        .pop-kernel:nth-child(3) { animation-delay: -.8s; }
        .pop-kernel:nth-child(4) { animation-delay: -1.6s; }
        .pop-kernel:nth-child(5) { animation-delay: -2.4s; }

        .pop-bucket {
          transform-origin: 50% 100%;
        }

        .fly-kernel,
        .pop-text {
          opacity: 0;
        }

        .corn-sparkle {
          animation: sparkle-twinkle 2.6s ease-in-out infinite;
        }

        .corn-sparkle:nth-child(2) { animation-delay: .8s; }
        .corn-sparkle:nth-child(3) { animation-delay: 1.5s; }

        /* Hover, keyboard focus and touch-press all trigger the show */
        .cinema-link:is(:hover, :focus-visible, :active) .pop-kernel {
          animation: kernel-pop .75s ease-in-out infinite;
        }

        .cinema-link:is(:hover, :focus-visible, :active) .pop-kernel:nth-child(2) { animation-delay: .12s; }
        .cinema-link:is(:hover, :focus-visible, :active) .pop-kernel:nth-child(3) { animation-delay: .24s; }
        .cinema-link:is(:hover, :focus-visible, :active) .pop-kernel:nth-child(4) { animation-delay: .08s; }
        .cinema-link:is(:hover, :focus-visible, :active) .pop-kernel:nth-child(5) { animation-delay: .3s; }

        .cinema-link:is(:hover, :focus-visible, :active) .pop-bucket {
          animation: bucket-wiggle .7s ease-in-out infinite;
        }

        .cinema-link:is(:hover, :focus-visible, :active) .fly-kernel {
          animation: kernel-fly 1.4s linear infinite;
          animation-delay: var(--delay);
        }

        .cinema-link:is(:hover, :focus-visible, :active) .pop-text {
          animation: pop-text 1.4s ease-out infinite;
        }

        /* ---------- OPEN BOOK ---------- */

        /* Resting state: the book floats, its shadow breathes */
        @keyframes book-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes shadow-breathe {
          0%, 100% { transform: scaleX(1); opacity: .2; }
          50% { transform: scaleX(.9); opacity: .12; }
        }

        @keyframes bookmark-idle {
          from { transform: rotate(-2.5deg); }
          to { transform: rotate(2.5deg); }
        }

        /* Hover: the bookmark swings properly */
        @keyframes bookmark-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(9deg); }
        }

        @keyframes book-sparkle {
          0%, 100% { opacity: .45; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes flower-spin {
          to { transform: rotate(360deg); }
        }

        /* Resting state: once in a while, one page quietly turns */
        @keyframes page-flip-idle {
          0%, 84% { opacity: 0; transform: scaleX(1) skewY(0deg); }
          85% { opacity: 1; transform: scaleX(1) skewY(0deg); }
          92% { opacity: 1; transform: scaleX(0) skewY(-7deg); }
          98% { opacity: 1; transform: scaleX(-1) skewY(0deg); }
          100% { opacity: 0; transform: scaleX(-1) skewY(0deg); }
        }

        /* Hover: pages flip through the book in a rapid ripple */
        @keyframes page-flip {
          0% { opacity: 1; transform: scaleX(1) skewY(0deg); }
          50% { opacity: 1; transform: scaleX(0) skewY(-9deg); }
          92% { opacity: 1; transform: scaleX(-1) skewY(0deg); }
          100% { opacity: 0; transform: scaleX(-1) skewY(0deg); }
        }

        /* Hover: words and symbols escape the story */
        @keyframes glyph-rise {
          0% { opacity: 0; transform: translate(0, 0) scale(.5) rotate(0deg); }
          18% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(var(--gx), var(--gy)) scale(1.15) rotate(var(--gr));
          }
        }

        .book-hover,
        .book-float,
        .book-shadow,
        .book-bookmark,
        .book-flower,
        .book-sparkle,
        .flip-page,
        .rise-glyph {
          transform-box: fill-box;
        }

        .book-hover {
          transform-origin: 50% 90%;
          transition: transform .5s cubic-bezier(.3, 1.5, .5, 1);
        }

        .library-link:is(:hover, :focus-visible, :active) .book-hover {
          transform: rotate(-2.5deg) scale(1.04);
        }

        .book-float {
          animation: book-float 5s ease-in-out infinite;
        }

        .book-shadow {
          transform-origin: center;
          animation: shadow-breathe 5s ease-in-out infinite;
        }

        .book-glow {
          opacity: 0;
          transition: opacity .6s ease;
        }

        .library-link:is(:hover, :focus-visible, :active) .book-glow {
          opacity: 1;
        }

        .book-bookmark {
          transform-origin: top center;
          animation: bookmark-idle 3.4s ease-in-out infinite alternate;
        }

        .library-link:is(:hover, :focus-visible, :active) .book-bookmark {
          animation: bookmark-wave .65s ease-in-out infinite;
        }

        .book-flower {
          transform-origin: center;
          animation: flower-spin 14s linear infinite;
        }

        .library-link:is(:hover, :focus-visible, :active) .book-flower {
          animation-duration: 2.5s;
        }

        .book-sparkle {
          transform-origin: center;
          animation: book-sparkle 2.8s ease-in-out infinite;
        }

        .book-sparkle:nth-child(2) { animation-delay: .9s; }
        .book-sparkle:nth-child(3) { animation-delay: 1.6s; }

        .flip-page {
          transform-origin: 0% 50%;
          opacity: 0;
        }

        .flip-page-1 {
          animation: page-flip-idle 9s ease-in-out 2s infinite;
        }

        .library-link:is(:hover, :focus-visible, :active) .flip-page {
          animation: page-flip 1.1s ease-in-out infinite;
        }

        .library-link:is(:hover, :focus-visible, :active) .flip-page-2 { animation-delay: .36s; }
        .library-link:is(:hover, :focus-visible, :active) .flip-page-3 { animation-delay: .72s; }

        .rise-glyph {
          transform-origin: center;
          opacity: 0;
        }

        .library-link:is(:hover, :focus-visible, :active) .rise-glyph {
          animation: glyph-rise 2s ease-out infinite;
          animation-delay: var(--gd);
        }

        @media (prefers-reduced-motion: reduce) {
          .pop-kernel,
          .fly-kernel,
          .pop-text,
          .corn-sparkle,
          .pop-bucket,
          .book-float,
          .book-shadow,
          .book-bookmark,
          .book-flower,
          .book-sparkle,
          .flip-page,
          .rise-glyph {
            animation: none !important;
          }

          .book-hover,
          .book-glow {
            transition: none;
          }

          .library-link:is(:hover, :focus-visible, :active) .book-hover {
            transform: none;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-end gap-3 py-2">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Brand />
        </div>

        <Link
          href="/login"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#713746] px-4 py-2 text-xs text-white transition hover:bg-[#8b4a5d] active:scale-95 sm:px-5 sm:text-sm"
        >
          Account ♡
        </Link>
      </header>


      {/* HERO */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center pb-8 pt-16 text-center sm:pb-14 sm:pt-24">
        <p className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[#a26f79] sm:text-xs sm:tracking-[0.3em]">
          A little corner of your world
        </p>

        <h1 className="font-serif text-[2.65rem] italic leading-[1.15] tracking-tight sm:text-6xl md:text-7xl">
          Stories we watch.
          <br />
          <span className="text-[#b66c7c]">Stories we read.</span>
        </h1>

        <p className="mt-5 max-w-[310px] text-[13px] leading-6 text-[#987c7c] sm:max-w-md sm:text-base sm:leading-7">
          A personal collection of films, books, little thoughts
          and stories worth remembering.
        </p>

        <div className="mt-5 flex items-center gap-2 text-[#b66c7c]">
          <Heart size={12} fill="currentColor" />
          <span className="text-[11px] sm:text-xs">
            Made for the love of stories
          </span>
          <Heart size={12} fill="currentColor" />
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-7">

        {/* THE CINEMA */}
        <Link
          href="/cinema"
          className="cinema-link group flex w-full flex-col overflow-visible p-1 transition duration-300 hover:-translate-y-1 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#a26f79] sm:text-[10px]">
              Collection 01
            </span>

            <ArrowUpRight
              size={19}
              className="text-[#a26f79] transition group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>

          {/* POPCORN */}
          <div className="flex h-[205px] w-full items-center justify-center py-3 sm:h-[250px]">
            <svg
              viewBox="0 0 240 230"
              className="h-full w-auto max-w-full overflow-visible"
              fill="none"
              aria-label="Animated popcorn bucket"
              role="img"
            >
              {/* Kernels sitting in the bucket */}
              <g fill="#f5d991" stroke="#c99c55" strokeWidth="1.8">
                <path className="pop-kernel" d="M66 73 C49 65 56 46 71 49 C76 30 98 35 98 52 C114 42 128 59 116 73 C130 85 116 99 99 91 L73 91 C59 89 55 80 66 73Z" />

                <path className="pop-kernel" d="M103 52 C94 37 109 25 120 35 C128 18 148 28 145 44 C162 40 170 58 155 69 C163 84 146 94 134 84 L112 74 C101 69 98 59 103 52Z" />

                <path className="pop-kernel" d="M146 77 C137 64 150 52 162 60 C168 45 185 52 181 68 C197 65 202 83 188 92 C193 105 177 112 165 103 L150 92 C142 88 141 82 146 77Z" />

                <path className="pop-kernel" d="M48 94 C35 83 43 69 56 73 C62 59 77 67 74 80 C89 77 95 93 82 101 C88 115 71 120 61 111 L48 105 C41 102 42 97 48 94Z" />

                <path className="pop-kernel" d="M91 91 C80 79 93 67 104 75 C111 61 126 69 123 82 C138 80 143 96 131 105 C137 117 121 125 110 115 L96 106 C87 102 86 96 91 91Z" />
              </g>

              {/* Kernels that launch out of the bucket on hover */}
              <g fill="#f5d991" stroke="#c99c55" strokeWidth="1.4">
                {FLYING_KERNELS.map((kernel, index) => (
                  <g
                    key={index}
                    className="fly-kernel"
                    style={
                      {
                        "--dx": kernel.dx,
                        "--peak": kernel.peak,
                        "--rot": kernel.rot,
                        "--delay": kernel.delay,
                      } as React.CSSProperties
                    }
                  >
                    <circle cx="120" cy="98" r="5.5" />
                    <circle cx="127" cy="96" r="4.8" />
                    <circle cx="123" cy="90" r="4.8" />
                    <circle cx="116" cy="92" r="4.2" />
                  </g>
                ))}
              </g>

              <g className="pop-bucket">
                <path
                  d="M43 104 Q120 94 197 104 L181 207 Q179 216 169 216 L71 216 Q61 216 59 207Z"
                  fill="#b66c7c"
                  stroke="#713746"
                  strokeWidth="3"
                />

                <path d="M62 103 L84 214 L105 214 L94 100Z" fill="#f9e9df" />
                <path d="M117 99 L116 215 L139 215 L143 101Z" fill="#f9e9df" />

                <path
                  d="M43 102 Q120 91 197 102 L195 115 Q120 125 45 115Z"
                  fill="#f8eae5"
                  stroke="#713746"
                  strokeWidth="3"
                />

                <path d="M65 137 L73 180" stroke="#713746" strokeWidth="2" opacity=".3" />
                <path d="M175 137 L167 180" stroke="#713746" strokeWidth="2" opacity=".3" />
                <path d="M65 207 Q120 218 175 207" stroke="#713746" strokeWidth="2" opacity=".4" />
              </g>

              {/* Sparkles */}
              <g fill="#b66c7c">
                <path className="corn-sparkle" d="M31 57 L35 68 L46 72 L35 76 L31 87 L27 76 L16 72 L27 68Z" />
                <path className="corn-sparkle" d="M203 47 L206 56 L215 59 L206 62 L203 71 L200 62 L191 59 L200 56Z" />
                <path className="corn-sparkle" d="M205 128 L208 135 L215 138 L208 141 L205 148 L202 141 L195 138 L202 135Z" />
              </g>

              {/* "pop!" appears on hover */}
              <text
                className="pop-text"
                x="24"
                y="36"
                fontSize="20"
                fontStyle="italic"
                fontFamily="Georgia, serif"
                fill="#b66c7c"
                aria-hidden="true"
              >
                pop!
              </text>
            </svg>
          </div>

          {/* CINEMA TEXT */}
          <div className="flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              <h2 className="font-serif text-[2rem] italic leading-tight sm:text-4xl">
                The Cinema
              </h2>

              <p className="mt-2 text-xs text-[#987c7c] sm:text-sm">
                Movies, series & memories
              </p>
            </div>

            <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#713746] px-4 text-[11px] text-white transition group-hover:bg-[#8b4a5d] active:scale-95 sm:text-xs">
              Explore ♡
            </span>
          </div>
        </Link>

        {/* THE LIBRARY */}
        <Link
          href="/library"
          className="library-link group flex w-full flex-col overflow-visible p-1 transition duration-300 hover:-translate-y-1 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#8d8975] sm:text-[10px]">
              Collection 02
            </span>

            <ArrowUpRight
              size={19}
              className="text-[#8d8975] transition group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>

          {/* OPEN BOOK */}
          <div className="flex h-[205px] w-full items-center justify-center py-3 sm:h-[250px]">
            <svg
              viewBox="0 0 260 210"
              className="h-full w-auto max-w-full overflow-visible"
              fill="none"
              aria-label="Animated open book"
              role="img"
            >
              <defs>
                <radialGradient id="bookGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f5d991" stopOpacity=".6" />
                  <stop offset="100%" stopColor="#f5d991" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Warm reading-lamp glow that fades in on hover */}
              <ellipse
                className="book-glow"
                cx="130"
                cy="108"
                rx="135"
                ry="85"
                fill="url(#bookGlow)"
              />

              {/* Sparkles */}
              <g fill="#9b9879">
                <path className="book-sparkle" d="M35 65 L40 78 L53 83 L40 88 L35 101 L30 88 L17 83 L30 78Z" />
                <path className="book-sparkle" d="M222 44 L226 54 L236 58 L226 62 L222 72 L218 62 L208 58 L218 54Z" />
                <path className="book-sparkle" d="M220 145 L224 154 L233 158 L224 162 L220 171 L216 162 L207 158 L216 154Z" />
              </g>

              <g className="book-hover">
                {/* Shadow */}
                <ellipse
                  className="book-shadow"
                  cx="130"
                  cy="174"
                  rx="91"
                  ry="10"
                  fill="#b9a995"
                  opacity=".2"
                />

                <g className="book-float">
                  {/* Left page */}
                  <g>
                    <path
                      d="M130 65 C104 47 64 45 28 58 L37 157 C72 145 105 151 130 174Z"
                      fill="#fff9ed"
                      stroke="#65705c"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />

                    <path d="M119 77 C93 65 67 64 43 72" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M119 93 C94 82 68 82 45 88" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M120 109 C95 98 70 99 47 104" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M120 125 C96 115 72 116 49 120" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M121 141 C96 132 75 133 51 136" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Right page */}
                  <g>
                    <path
                      d="M130 65 C156 47 196 45 232 58 L223 157 C188 145 155 151 130 174Z"
                      fill="#fffdf4"
                      stroke="#65705c"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />

                    <path d="M141 77 C167 65 193 64 217 72" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M141 93 C166 82 192 82 215 88" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M141 109 C166 98 190 99 213 104" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M141 125 C165 115 188 116 211 120" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M141 141 C165 132 186 133 209 136" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Centre binding */}
                  <path
                    d="M130 65 L130 174"
                    stroke="#65705c"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Bookmark */}
                  <g className="book-bookmark">
                    <path
                      d="M169 51 L169 104 L179 95 L189 104 L189 51Z"
                      fill="#b66c7c"
                      stroke="#713746"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* Little flower (it slowly spins) */}
                  <g transform="translate(75 48)">
                    <g className="book-flower" fill="#b66c7c">
                      <circle cx="0" cy="-5" r="5" />
                      <circle cx="5" cy="0" r="5" />
                      <circle cx="0" cy="5" r="5" />
                      <circle cx="-5" cy="0" r="5" />
                      <circle cx="0" cy="0" r="2" fill="#f5d991" />
                    </g>
                  </g>

                  {/* Pages that flip across the spine */}
                  {[1, 2, 3].map((n) => (
                    <g key={n} className={`flip-page flip-page-${n}`}>
                      <path
                        d="M130 65 C156 47 196 45 232 58 L223 157 C188 145 155 151 130 174Z"
                        fill="#fff6e3"
                        stroke="#65705c"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      <path d="M141 77 C167 65 193 64 217 72" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                      <path d="M141 93 C166 82 192 82 215 88" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                      <path d="M141 109 C166 98 190 99 213 104" stroke="#c5b99e" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  ))}
                </g>
              </g>

              {/* Words and symbols that escape the story on hover */}
              {BOOK_GLYPHS.map((glyph, index) => (
                <text
                  key={index}
                  className="rise-glyph"
                  x={glyph.x}
                  y="72"
                  textAnchor="middle"
                  fontSize={glyph.size}
                  fontStyle="italic"
                  fontFamily="Georgia, serif"
                  fill={glyph.color}
                  aria-hidden="true"
                  style={
                    {
                      "--gx": glyph.gx,
                      "--gy": glyph.gy,
                      "--gr": glyph.gr,
                      "--gd": glyph.delay,
                    } as React.CSSProperties
                  }
                >
                  {glyph.text}
                </text>
              ))}
            </svg>
          </div>

          {/* LIBRARY TEXT */}
          <div className="flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              <h2 className="font-serif text-[2rem] italic leading-tight sm:text-4xl">
                The Library
              </h2>

              <p className="mt-2 text-xs text-[#85816e] sm:text-sm">
                Books, notes & little thoughts
              </p>
            </div>

            <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#65705c] px-4 text-[11px] text-white transition group-hover:bg-[#56604d] active:scale-95 sm:text-xs">
              Explore ♡
            </span>
          </div>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-4xl pb-6 pt-14 text-center sm:py-12">
        <p className="font-serif text-base italic text-[#987c7c] sm:text-lg">
          Two ways to collect little pieces of life.
        </p>

        <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-[#b49a9c] sm:text-[10px] sm:tracking-[0.2em]">
          brain rot & bookmarks · made with love ♡
        </p>
      </footer>
    </main>
  );
}