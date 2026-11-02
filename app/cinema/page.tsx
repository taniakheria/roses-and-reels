"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Heart,
  Check,
  Trash2,
  LoaderCircle,
  Sparkles,
  Flower2,
  Save,
  Film,
  X,
} from "lucide-react";

import Brand from "@/components/Brand";

type Movie = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
};

type Entry = Movie & {
  entry_id: string;
  status: "watchlist" | "currently_watching" | "watched";
  rating: number | null;
  review: string;
  is_favorite: boolean;
};

type Petal = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  symbol: string;
};

const supabase = createClient();

const sparklePositions = [
  { left: "8%", top: "18%" },
  { left: "20%", top: "70%" },
  { left: "32%", top: "12%" },
  { left: "43%", top: "82%" },
  { left: "55%", top: "20%" },
  { left: "66%", top: "72%" },
  { left: "78%", top: "14%" },
  { left: "90%", top: "40%" },
  { left: "13%", top: "48%" },
  { left: "36%", top: "45%" },
  { left: "72%", top: "48%" },
  { left: "94%", top: "80%" },
];

const ratingLabels = [
  "Didn't love it",
  "It was okay",
  "Pretty good",
  "Loved it",
  "Absolutely iconic!",
];

const statusLabels: Record<Entry["status"], string> = {
  watchlist: "On your watchlist",
  currently_watching: "Now playing",
  watched: "Watched",
};

const tabs: [string, string][] = [
  ["watchlist", "Watchlist"],
  ["currently_watching", "Currently watching"],
  ["watched", "Watched"],
  ["favourites", "Favourites ♡"],
  ["all", "Everything"],
];

const searchHints = [
  "Search movies or TV shows…",
  "Try “Pride & Prejudice”…",
  "Try “Spirited Away”…",
  "Try “Before Sunrise”…",
  "Try “Little Women”…",
];

const petalSymbols = ["🌸", "🌷", "✿", "❀", "🍃"];

/* Pinterest-style: posters get slightly different crops so the board feels uneven and organic */
const posterRatios = ["aspect-[2/3]", "aspect-[3/4]", "aspect-[2/3]", "aspect-[5/7]"];

const heroWords = ["Every", "story", "leaves", "a", "little"];

/* ---------- helpers ---------- */

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState("");

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const phrase = phrases[phraseIndex];

      if (!deleting) {
        charIndex++;
        setText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) {
          deleting = true;
          timer = setTimeout(step, 1600);
          return;
        }
        timer = setTimeout(step, 70);
      } else {
        charIndex--;
        setText(phrase.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = setTimeout(step, 400);
          return;
        }
        timer = setTimeout(step, 35);
      }
    };

    timer = setTimeout(step, 600);
    return () => clearTimeout(timer);
  }, [phrases]);

  return text;
}

function handleTilt(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  el.style.setProperty("--ry", `${x * 12}deg`);
  el.style.setProperty("--rx", `${-y * 12}deg`);
  el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
  el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
}

function resetTilt(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--ry", "0deg");
  el.style.setProperty("--rx", "0deg");
}

/** How many columns fit the screen. */
function useColumnCount() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const calculate = () => {
      const width = window.innerWidth;
      setCount(width >= 1024 ? 5 : width >= 768 ? 4 : width >= 560 ? 3 : 2);
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  return count;
}

/**
 * Pinterest-style masonry built from real flex columns, so a card
 * can never be split across two columns (which CSS `columns` can do).
 */
function Masonry<T>({
  items,
  render,
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
}) {
  const columnCount = useColumnCount();

  const columns: { item: T; index: number }[][] = Array.from(
    { length: columnCount },
    () => []
  );

  items.forEach((item, index) => {
    columns[index % columnCount].push({ item, index });
  });

  return (
    <div className="flex items-start gap-4 sm:gap-5">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-6">
          {column.map(({ item, index }) => render(item, index))}
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const [userId, setUserId] = useState("");
  const [movies, setMovies] = useState<Entry[]>([]);
  const [results, setResults] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("watchlist");
  const [busy, setBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState("");
  const [ratingBusyId, setRatingBusyId] = useState("");
  const [favoriteBusyId, setFavoriteBusyId] = useState("");
  const [reviewBusyId, setReviewBusyId] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [savedReviews, setSavedReviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [ratingPop, setRatingPop] = useState("");
  const [favoritePop, setFavoritePop] = useState("");
  const [petals, setPetals] = useState<Petal[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [selectedId, setSelectedId] = useState("");

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const petalCounter = useRef(0);
  const placeholder = useTypewriter(searchHints);

  const selected = movies.find((movie) => movie.entry_id === selectedId) ?? null;

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 3000);
  }

  function releasePetals() {
    const batch: Petal[] = Array.from({ length: 24 }, () => ({
      id: petalCounter.current++,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 3.5 + Math.random() * 3,
      size: 16 + Math.random() * 16,
      symbol: petalSymbols[Math.floor(Math.random() * petalSymbols.length)],
    }));

    setPetals((previous) => [...previous, ...batch]);

    window.setTimeout(() => {
      const ids = new Set(batch.map((petal) => petal.id));
      setPetals((previous) => previous.filter((petal) => !ids.has(petal.id)));
    }, 8000);
  }

  /* sliding tab pill */
  useEffect(() => {
    const update = () => {
      const el = tabRefs.current[tab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };

    update();
    window.addEventListener("resize", update);
    document.fonts?.ready.then(update);

    return () => window.removeEventListener("resize", update);
  }, [tab]);

  /* close the popup with Escape */
  useEffect(() => {
    if (!selectedId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId("");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  async function loadMovies() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id ?? "");

    if (!user) {
      setMovies([]);
      return;
    }

    const { data, error } = await supabase
      .from("movie_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMovies(
      (data ?? []).map((row) => ({
        id: row.tmdb_id,
        entry_id: row.id,
        media_type: row.media_type,
        title: row.title,
        poster_path: row.poster_path ?? "",
        overview: row.overview ?? "",
        release_date: row.release_date ?? "",
        genre_ids: row.genre_ids ?? [],
        status: row.status,
        rating: row.rating,
        review: row.review ?? "",
        is_favorite: row.is_favorite ?? false,
      }))
    );
  }

  useEffect(() => {
    loadMovies();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMovies();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function searchMovies(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setBusy(true);
    setMessage("");
    setResults([]);

    try {
      const response = await fetch(
        `/api/tmdb?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Search failed.");
      }

      setResults(data.results ?? []);

      if (!data.results?.length) {
        setMessage("No results found. Try another title.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addMovie(movie: Movie) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("movie_entries").insert({
      user_id: userId,
      tmdb_id: movie.id,
      media_type: movie.media_type,
      title: movie.title,
      poster_path: movie.poster_path,
      overview: movie.overview,
      release_date: movie.release_date,
      genre_ids: movie.genre_ids,
      status: "watchlist",
    });

    if (error?.code === "23505") {
      showToast("Already in your diary ♡");
      return;
    }

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMovies();
    showToast(`${movie.title} added to your diary ♡`);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 3000);
  }

  async function updateStatus(movie: Entry) {
    if (statusBusyId) return;

    setStatusBusyId(movie.entry_id);
    const next =
      movie.status === "watchlist"
        ? "currently_watching"
        : movie.status === "currently_watching"
          ? "watched"
          : "watchlist";

    const { error } = await supabase
      .from("movie_entries")
      .update({
        status: next,
        watched_on:
          next === "watched" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
    } else {
      await loadMovies();
      if (next === "watched") releasePetals();
      showToast(
        next === "watched"
          ? `${movie.title} — watched! ♡`
          : next === "currently_watching"
            ? `${movie.title} is now playing ♡`
            : `${movie.title} moved to your watchlist`
      );
    }

    setStatusBusyId("");
  }

  async function rateMovie(movie: Entry, rating: number) {
    if (ratingBusyId) return;

    setRatingBusyId(movie.entry_id);
    setRatingPop(movie.entry_id);

    const { error } = await supabase
      .from("movie_entries")
      .update({ rating })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
    } else {
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id ? { ...item, rating } : item
        )
      );
      showToast(`${rating}/5 — ${ratingLabels[rating - 1]} ✨`);
    }

    window.setTimeout(() => setRatingPop(""), 450);
    setRatingBusyId("");
  }

  async function toggleFavorite(movie: Entry) {
    if (favoriteBusyId) return;

    setFavoriteBusyId(movie.entry_id);
    const next = !movie.is_favorite;
    setFavoritePop(movie.entry_id);

    const { error } = await supabase
      .from("movie_entries")
      .update({ is_favorite: next })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
    } else {
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id
            ? { ...item, is_favorite: next }
            : item
        )
      );
      showToast(next ? `Added to your favourites ♡` : `Removed from favourites`);
    }

    window.setTimeout(() => setFavoritePop(""), 450);
    setFavoriteBusyId("");
  }

  async function saveReview(movie: Entry) {
    const review = reviewDrafts[movie.entry_id] ?? movie.review;

    if (reviewBusyId) return;
    if (review === movie.review) {
      showToast("Your review is already saved ♡");
      return;
    }

    setReviewBusyId(movie.entry_id);

    const { error } = await supabase
      .from("movie_entries")
      .update({ review })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
    } else {
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id ? { ...item, review } : item
        )
      );
      setReviewDrafts((previous) => {
        const next = { ...previous };
        delete next[movie.entry_id];
        return next;
      });
      setSavedReviews((previous) => [...previous, movie.entry_id]);
      showToast("Your little review is saved ♡");

      window.setTimeout(() => {
        setSavedReviews((previous) =>
          previous.filter((id) => id !== movie.entry_id)
        );
      }, 2500);
    }

    setReviewBusyId("");
  }

  async function deleteMovie(movie: Entry) {
    if (!window.confirm(`Remove ${movie.title} from your diary?`)) return;

    const { error } = await supabase
      .from("movie_entries")
      .delete()
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
    } else {
      if (selectedId === movie.entry_id) setSelectedId("");
      await loadMovies();
      showToast(`${movie.title} removed from your diary`);
    }
  }

  const visible = movies.filter(
    (movie) =>
      tab === "all" ||
      (tab === "favourites" ? movie.is_favorite : movie.status === tab)
  );

  const collage = movies.slice(0, 3);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#faf5ed] px-4 pb-8 pt-5 text-[#633747] sm:px-6 sm:pt-7 md:px-10">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&display=swap");

        .font-display {
          font-family: "Fraunces", Georgia, serif;
          font-variation-settings: "SOFT" 100;
        }

        /* ---------- celebration + toast motion ---------- */
        @keyframes sparkle-pop {
          0% { opacity: 0; transform: scale(0) rotate(-30deg) translateY(15px); }
          20% { opacity: 1; transform: scale(1.4) rotate(15deg); }
          65% { opacity: 1; transform: scale(1) translateY(-12px); }
          100% { opacity: 0; transform: scale(.3) rotate(35deg) translateY(-35px); }
        }
        @keyframes toast-appear {
          0% { opacity: 0; transform: translate(-50%, 18px) scale(.9); }
          12%, 80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -8px) scale(.98); }
        }
        @keyframes heart-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.65) rotate(-12deg); }
          70% { transform: scale(.85) rotate(8deg); }
          100% { transform: scale(1); }
        }
        @keyframes star-pop {
          0% { transform: scale(.6) rotate(-25deg); }
          60% { transform: scale(1.5) rotate(12deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .sparkle {
          position: fixed;
          z-index: 100;
          pointer-events: none;
          color: #b66c7c;
          font-size: clamp(20px, 3vw, 38px);
          animation: sparkle-pop 1.5s ease-out forwards;
          text-shadow: 0 2px 12px #e7b5c4;
        }
        .success-toast {
          position: fixed;
          z-index: 140;
          bottom: calc(20px + env(safe-area-inset-bottom));
          left: 50%;
          animation: toast-appear 3s ease-in-out forwards;
          pointer-events: none;
        }
        .heart-pop { animation: heart-pop .45s ease-out; }
        .star-pop { animation: star-pop .35s ease-out; }

        /* ---------- dreamy drifting background ---------- */
        .aurora {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .aurora span {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px);
          opacity: 0.55;
          animation: drift 18s ease-in-out infinite alternate;
        }
        .aurora span:nth-child(1) { width: 420px; height: 420px; top: -120px; left: -80px; background: #f2c3b8; }
        .aurora span:nth-child(2) { width: 380px; height: 380px; top: 80px; right: -100px; background: #d9c5ee; animation-delay: -6s; }
        .aurora span:nth-child(3) { width: 340px; height: 340px; top: 620px; left: 25%; background: #cfe0bd; animation-delay: -11s; }
        .aurora span:nth-child(4) { width: 300px; height: 300px; top: 1100px; right: 6%; background: #f5dba3; animation-delay: -3s; }
        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.18); }
        }

        /* ---------- hero words rise gently ---------- */
        .hero-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(40px) rotate(3deg);
          animation: word-rise 0.9s cubic-bezier(0.2, 0.9, 0.25, 1.1) forwards;
        }
        @keyframes word-rise {
          to { opacity: 1; transform: translateY(0) rotate(0); }
        }
        .hero-fade {
          opacity: 0;
          animation: fade-in 0.9s ease forwards;
        }
        @keyframes fade-in { to { opacity: 1; } }

        /* ---------- pinned polaroid collage ---------- */
        .polaroid {
          position: absolute;
          width: 138px;
          padding: 8px 8px 26px;
          border-radius: 6px;
          background: #fffdfa;
          box-shadow: 0 16px 30px rgba(91, 58, 48, 0.2);
          animation: pin-float 6s ease-in-out infinite;
        }
        .polaroid:nth-child(1) { left: 0;    top: 46px; --r: -9deg; animation-delay: -1s; }
        .polaroid:nth-child(2) { left: 74px; top: 4px;  --r: 3deg;  animation-delay: -2.6s; z-index: 2; }
        .polaroid:nth-child(3) { left: 142px; top: 56px; --r: 10deg; animation-delay: -4s; z-index: 1; }
        .polaroid::before {
          content: "";
          position: absolute;
          top: -9px;
          left: 50%;
          width: 52px;
          height: 17px;
          transform: translateX(-50%) rotate(-3deg);
          background: rgba(242, 195, 184, 0.75);
          border-radius: 2px;
        }
        @keyframes pin-float {
          0%, 100% { transform: translateY(0) rotate(var(--r)); }
          50%      { transform: translateY(-10px) rotate(calc(var(--r) + 2deg)); }
        }

        /* ---------- search glow ---------- */
        @property --glow-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes glow-spin { to { --glow-angle: 360deg; } }
        .glow-border {
          border-radius: 2rem;
          padding: 2px;
          background: conic-gradient(from var(--glow-angle), #f2c3b8, #d9c5ee, #cfe0bd, #f5dba3, #f2c3b8);
          animation: glow-spin 7s linear infinite;
        }

        /* ---------- tabs ---------- */
        .tab-pill {
          transition: left 0.45s cubic-bezier(0.3, 1.25, 0.4, 1),
                      width 0.45s cubic-bezier(0.3, 1.25, 0.4, 1);
        }

        /* ---------- pinboard cards ---------- */
        .reveal {
          opacity: 0;
          animation: reveal-up 0.75s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards;
        }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(50px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pin-card { transition: transform 0.35s ease; }
        .pin-card:hover { transform: translateY(-4px); }

        .tilt {
          --rx: 0deg; --ry: 0deg; --mx: 50%; --my: 50%;
          position: relative;
          transform: perspective(800px) rotateX(var(--rx)) rotateY(var(--ry));
          transition: transform 0.18s ease-out, box-shadow 0.3s ease;
        }
        .tilt::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s;
          background: radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.5), transparent 55%);
        }
        .pin-card:hover .tilt::after { opacity: 1; }
        .pin-card:hover .tilt { box-shadow: 0 20px 34px rgba(91, 58, 48, 0.24); }

        /* hover actions on the poster, like a pin */
        .pin-actions {
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .pin-card:hover .pin-actions,
        .pin-card:focus-within .pin-actions { opacity: 1; transform: translateY(0); }
        @media (hover: none) {
          .pin-actions { opacity: 1; transform: none; }
        }

        /* now playing: soft pastel ring chases around the poster */
        @property --marquee-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes marquee-chase { to { --marquee-angle: 360deg; } }
        .now-playing {
          padding: 3px;
          border-radius: 1.15rem;
          background: conic-gradient(from var(--marquee-angle), #f2c3b8, #d9c5ee, #cfe0bd, #f5dba3, #f2c3b8);
          animation: marquee-chase 5s linear infinite;
          box-shadow: 0 8px 26px rgba(198, 140, 160, 0.35);
        }

        /* ---------- popup ---------- */
        .modal-pop { animation: modal-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        @keyframes modal-pop {
          from { opacity: 0; transform: translateY(30px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ---------- falling petals ---------- */
        .petal {
          position: fixed;
          top: -40px;
          z-index: 105;
          pointer-events: none;
          animation: petal-fall linear forwards;
        }
        @keyframes petal-fall {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          50%  { transform: translate3d(60px, 55vh, 0) rotate(200deg); }
          100% { transform: translate3d(-40px, 110vh, 0) rotate(420deg); opacity: 0.2; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sparkle, .success-toast, .heart-pop, .star-pop, .aurora span,
          .polaroid, .glow-border, .now-playing, .petal, .modal-pop { animation: none; }
          .hero-word, .hero-fade, .reveal {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .tilt { transform: none; }
        }
      `}</style>

      {/* dreamy background */}
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      {celebrating && (
        <div aria-hidden="true">
          {sparklePositions.map((position, index) => (
            <span key={index} className="sparkle" style={position}>
              {index % 3 === 0 ? "★" : index % 3 === 1 ? "✧" : "✦"}
            </span>
          ))}
        </div>
      )}

      {petals.map((petal) => (
        <span
          key={petal.id}
          className="petal"
          aria-hidden="true"
          style={{
            left: `${petal.left}%`,
            fontSize: petal.size,
            color: "#c9707f",
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
          }}
        >
          {petal.symbol}
        </span>
      ))}

      {toast && (
        <div
          key={toast}
          role="status"
          className="success-toast rounded-full border border-[#e7c5cb] bg-white px-6 py-3 text-sm text-[#713746] shadow-xl"
        >
          ✨ {toast}
        </div>
      )}

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Brand />
          <a
            href="/login"
            className="min-h-11 shrink-0 rounded-full bg-[#713746] px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d] hover:shadow-lg sm:px-5 sm:text-base"
          >
            {userId ? "Account ♡" : "Sign in ♡"}
          </a>
        </header>

        <section className="mx-auto max-w-6xl py-9 sm:py-12 md:py-14">
          {/* Hero */}
          <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
            <div>
              <p
                className="hero-fade mb-4 text-sm text-[#a26f79]"
                style={{ animationDelay: "0.1s" }}
              >
                your personal film diary
              </p>

              <h1 className="font-display text-[clamp(2.7rem,9vw,3.5rem)] leading-[1.05] sm:text-6xl md:text-7xl">
                {heroWords.map((word, index) => (
                  <span
                    key={word + index}
                    className="hero-word mr-[0.25em]"
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    {word}
                  </span>
                ))}
                <br />
                <span
                  className="hero-word italic text-[#b66c7c]"
                  style={{ animationDelay: "650ms" }}
                >
                  something.
                </span>
              </h1>
            </div>

            {/* pinned polaroids */}
            <div
              className="relative hidden h-64 w-72 shrink-0 sm:block"
              aria-hidden="true"
            >
              {(collage.length > 0
                ? collage
                : ([null, null, null] as (Entry | null)[])
              ).map((movie, index) => (
                <div key={movie?.entry_id ?? index} className="polaroid">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9]">
                    {movie?.poster_path ? (
                      <Image
                        fill
                        unoptimized
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt=""
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#9b766f]">
                        <Film size={28} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="glow-border mt-10 max-w-2xl">
            <form
              onSubmit={searchMovies}
              className="flex min-h-14 w-full items-center gap-1.5 rounded-[calc(2rem-2px)] bg-[#fffdfa] p-1.5 sm:gap-2 sm:p-2"
            >
              <Search className="ml-3 shrink-0 text-[#b66c7c]" size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder || " "}
                aria-label="Search movies or TV shows"
                className="min-w-0 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-[#b49a9c] sm:px-2"
              />
              <button
                disabled={busy}
                className="min-h-10 shrink-0 rounded-full bg-[#713746] px-4 py-2 text-sm text-white transition hover:bg-[#8b4a5d] active:scale-95 disabled:opacity-50 sm:px-6 sm:text-base"
              >
                {busy ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {message && (
            <p role="status" className="mt-4 text-sm">
              {message}
            </p>
          )}

          {/* Search results as a masonry board */}
          {results.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 font-display text-3xl">Found for you ♡</h2>

              <Masonry
                items={results}
                render={(movie, index) => (
                  <div
                    key={`${movie.media_type}-${movie.id}`}
                    className="reveal"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <article className="pin-card">
                      <div
                        className={`tilt relative ${posterRatios[index % posterRatios.length]} overflow-hidden rounded-3xl bg-[#ead9d1] shadow-md`}
                        onMouseMove={handleTilt}
                        onMouseLeave={resetTilt}
                      >
                        {movie.poster_path ? (
                          <Image
                            fill
                            unoptimized
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={`${movie.title} poster`}
                            className="object-cover"
                          />
                        ) : (
                          <div className="p-4">Poster unavailable</div>
                        )}

                        <button
                          onClick={() => addMovie(movie)}
                          className="pin-actions absolute right-3 top-3 z-10 rounded-full bg-[#b66c7c] px-4 py-2 text-xs font-medium text-white shadow-md transition hover:bg-[#a65d6e] active:scale-95"
                        >
                          + Save
                        </button>
                      </div>

                      <h3 className="mt-3 break-words px-1 font-display text-base leading-snug sm:text-lg">
                        {movie.title}
                      </h3>
                      <p className="px-1 text-xs text-[#987c7c]">
                        {movie.release_date?.slice(0, 4)} ·{" "}
                        {movie.media_type === "tv" ? "Series" : "Film"}
                      </p>
                      <p className="mt-1 line-clamp-3 px-1 text-xs leading-5 text-[#876d70]">
                        {movie.overview}
                      </p>
                      <button
                        onClick={() => addMovie(movie)}
                        className="mt-3 min-h-11 w-full rounded-full border border-[#d9b9b6] bg-white/60 px-2 py-2 text-xs transition hover:bg-[#f0dfd7] active:scale-95 sm:text-sm"
                      >
                        + Add to watchlist
                      </button>
                    </article>
                  </div>
                )}
              />
            </section>
          )}

          {/* Collection */}
          <section className="mt-14 sm:mt-20">
            <h2 className="font-display text-3xl sm:text-4xl">
              Your little collection
            </h2>

            {/* Tabs with a sliding pill */}
            <div className="no-scrollbar -mx-4 mb-8 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <div
                role="tablist"
                className="relative flex w-max gap-1 rounded-full border border-[#e9dfd6] bg-white/60 p-1 backdrop-blur-sm"
              >
                <div
                  aria-hidden="true"
                  className="tab-pill absolute bottom-1 top-1 rounded-full bg-gradient-to-r from-[#94766b] to-[#b66c7c] shadow-md"
                  style={{ left: indicator.left, width: indicator.width }}
                />
                {tabs.map(([value, label]) => (
                  <button
                    key={value}
                    ref={(el) => {
                      tabRefs.current[value] = el;
                    }}
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={`relative z-10 min-h-11 shrink-0 rounded-full px-4 py-2 text-sm transition-colors duration-300 sm:px-5 ${
                      tab === value ? "text-white" : "text-[#81746a] hover:text-[#51463e]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!userId ? (
              <div className="rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center backdrop-blur-sm sm:p-12">
                <Heart className="mx-auto mb-4 animate-bounce text-[#b66c7c]" size={30} />
                <h3 className="font-display text-2xl">Your stories belong here.</h3>
                <p className="mt-2 text-sm">Sign in to save your personal collection.</p>
              </div>
            ) : visible.length === 0 ? (
              <div
                key={tab}
                className="reveal rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center backdrop-blur-sm sm:p-12"
              >
                <p className="animate-bounce text-4xl">🎬 🌷</p>
                <h3 className="mt-4 font-display text-2xl">A blank page, for now.</h3>
                <p className="mt-2 text-sm">
                  Search for a title above and add it to your diary.
                </p>
              </div>
            ) : (
              <Masonry
                key={tab}
                items={visible}
                render={(movie, index) => {
                  const isSavingStatus = statusBusyId === movie.entry_id;
                  const playing = movie.status === "currently_watching";

                  return (
                    <div
                      key={movie.entry_id}
                      className="reveal"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <article className="pin-card relative min-w-0">
                        <div className={playing ? "now-playing" : ""}>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Open ${movie.title}`}
                            onClick={() => setSelectedId(movie.entry_id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedId(movie.entry_id);
                              }
                            }}
                            className={`tilt relative cursor-pointer ${posterRatios[index % posterRatios.length]} overflow-hidden ${
                              playing ? "rounded-[1.05rem]" : "rounded-3xl"
                            } bg-[#ead9d1] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-4`}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                          >
                            {movie.poster_path ? (
                              <Image
                                fill
                                unoptimized
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                className="object-cover"
                              />
                            ) : (
                              <div className="p-4">Poster unavailable</div>
                            )}

                            {playing && (
                              <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] text-[#87505e] shadow-sm">
                                Now playing
                              </span>
                            )}

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleFavorite(movie);
                              }}
                              disabled={Boolean(favoriteBusyId)}
                              title={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                              aria-label={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                              className={`pin-actions absolute right-3 top-3 z-10 rounded-full p-2 shadow-md transition-all duration-200 hover:scale-110 active:scale-90 disabled:opacity-50 ${
                                movie.is_favorite
                                  ? "bg-[#fbe8ed] text-[#c04d70]"
                                  : "bg-white/95 text-[#bda1a4] hover:text-[#c04d70]"
                              } ${favoritePop === movie.entry_id ? "heart-pop" : ""}`}
                            >
                              <Heart size={19} fill={movie.is_favorite ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedId(movie.entry_id)}
                          className="mt-3 block w-full px-1 text-left"
                        >
                          <h3 className="break-words font-display text-base leading-snug sm:text-lg">
                            {movie.title}
                          </h3>
                          <p className="text-xs text-[#987c7c]">
                            {movie.release_date?.slice(0, 4)} ·{" "}
                            {movie.media_type === "tv" ? "Series" : "Film"}
                          </p>
                        </button>

                        <button
                          onClick={() => updateStatus(movie)}
                          disabled={Boolean(statusBusyId)}
                          className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs font-medium transition-all duration-200 disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm ${
                            movie.status === "watched"
                              ? "border-[#65705c] bg-[#edf2e9] text-[#52634a]"
                              : playing
                                ? "border-[#b66c7c] bg-[#f8e8ec] text-[#713746]"
                                : "border-[#713746] bg-[#713746] text-white hover:-translate-y-0.5 hover:bg-[#8b4a5d] active:scale-95"
                          }`}
                        >
                          {isSavingStatus ? (
                            <><LoaderCircle size={16} className="animate-spin" /> Saving...</>
                          ) : movie.status === "watched" ? (
                            <><Check size={16} /> Watched it ♡</>
                          ) : playing ? (
<><Check size={16} /> Mark as watched</>                          ) : (
                            <><Heart size={16} /> Start watching</>
                          )}
                        </button>

                        {movie.status === "watched" && (
                          <button
                            onClick={() => setSelectedId(movie.entry_id)}
                            className="mt-2 flex items-center gap-1.5 px-1 text-xs text-[#a26f79] transition hover:text-[#713746]"
                          >
                            <Sparkles size={13} />
                            {movie.rating
                              ? `${movie.rating}/5 petals · rate & review`
                              : "Rate & review"}
                          </button>
                        )}

                        <button
                          onClick={() => deleteMovie(movie)}
                          className="mt-2 flex items-center gap-1 px-1 text-xs text-[#987c7c] transition hover:text-[#713746]"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </article>
                    </div>
                  );
                }}
              />
            )}
          </section>
        </section>

        <footer className="px-2 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-[#987c7c]">
          Made with love, for the stories that stay. ♡
        </footer>
      </div>

      {/* Movie popup: rating + review live here, not on the cards */}
      {selected && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#352b27]/45 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId("");
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.title} details`}
            className="modal-pop relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#eee4da] bg-[#fffdfa] p-6 shadow-2xl sm:p-8"
          >
            <button
              onClick={() => setSelectedId("")}
              aria-label="Close details"
              className="absolute right-5 top-5 z-10 rounded-full bg-[#f4eee8] p-2 text-[#8d776b] transition hover:rotate-90 hover:bg-[#eadfd5]"
            >
              <X size={18} />
            </button>

            <div className="flex gap-5 pr-8 sm:gap-7">
              <div
                className="tilt relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-[#ead9d1] shadow-xl sm:w-36"
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
              >
                {selected.poster_path ? (
                  <Image
                    fill
                    unoptimized
                    src={`https://image.tmdb.org/t/p/w500${selected.poster_path}`}
                    alt={selected.title}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#9b766f]">
                    <Film size={30} />
                  </div>
                )}
              </div>

              <div className="min-w-0 self-center">
                <span className="inline-flex rounded-full bg-[#f4e8e2] px-3 py-1.5 text-xs text-[#98776b]">
                  {statusLabels[selected.status]}
                </span>

                <h2 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">
                  {selected.title}
                </h2>

                <p className="mt-1 text-sm text-[#987c7c]">
                  {selected.release_date?.slice(0, 4)} ·{" "}
                  {selected.media_type === "tv" ? "Series" : "Film"}
                </p>

                {selected.overview && (
                  <p className="mt-3 line-clamp-4 text-xs leading-5 text-[#876d70] sm:text-sm sm:leading-6">
                    {selected.overview}
                  </p>
                )}
              </div>
            </div>

            <div className="my-7 border-t border-[#eee5dc]" />

            {selected.status === "watched" ? (
              <>
                <section>
                  <p className="mb-3 text-sm text-[#a26f79]">Your rating</p>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((petal) => (
                      <button
                        key={petal}
                        onClick={() => rateMovie(selected, petal)}
                        disabled={Boolean(ratingBusyId)}
                        aria-label={`Rate ${petal} out of 5 petals`}
                        title={`${petal} out of 5 petals`}
                        className={`rounded-full p-1.5 transition duration-200 hover:-rotate-12 hover:scale-125 active:scale-90 disabled:opacity-50 ${
                          ratingPop === selected.entry_id ? "star-pop" : ""
                        } ${petal <= (selected.rating ?? 0) ? "text-[#c77d91]" : "text-[#ddc9bc]"}`}
                      >
                        <Flower2
                          size={28}
                          strokeWidth={1.8}
                          fill={petal <= (selected.rating ?? 0) ? "currentColor" : "none"}
                        />
                      </button>
                    ))}

                    {ratingBusyId === selected.entry_id && (
                      <LoaderCircle size={16} className="ml-1 animate-spin" />
                    )}
                  </div>

                  <p className="mt-2 min-h-5 text-xs text-[#89515f]">
                    {selected.rating
                      ? `${selected.rating}/5 petals — ${ratingLabels[selected.rating - 1]}`
                      : "Unfold a petal for each point"}
                  </p>
                </section>

                <div className="my-7 border-t border-[#eee5dc]" />

                <section>
                  <label
                    htmlFor={`review-${selected.entry_id}`}
                    className="flex items-center gap-2 font-display text-lg"
                  >
                    <Sparkles size={16} className="text-[#b66c7c]" />
                    Your little review
                  </label>

                  <textarea
                    id={`review-${selected.entry_id}`}
                    value={reviewDrafts[selected.entry_id] ?? selected.review}
                    onChange={(e) => {
                      setReviewDrafts((previous) => ({
                        ...previous,
                        [selected.entry_id]: e.target.value,
                      }));
                      setSavedReviews((previous) =>
                        previous.filter((id) => id !== selected.entry_id)
                      );
                    }}
                    placeholder="How did it make you feel? Write your little thoughts..."
                    rows={5}
                    className="mt-3 w-full resize-none rounded-2xl border border-[#eee1d6] bg-white p-4 text-sm leading-7 outline-none transition placeholder:text-[#b5aaa1] focus:border-[#b66c7c] focus:ring-2 focus:ring-[#eacbd3]"
                  />

                  {(() => {
                    const draft = reviewDrafts[selected.entry_id] ?? selected.review;
                    const reviewChanged = draft !== selected.review;
                    const isSavingReview = reviewBusyId === selected.entry_id;

                    return (
                      <button
                        onClick={() => saveReview(selected)}
                        disabled={isSavingReview || !reviewChanged}
                        className={`mt-3 flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm transition-all duration-200 disabled:cursor-default ${
                          savedReviews.includes(selected.entry_id)
                            ? "bg-[#e5efe2] text-[#52704d]"
                            : reviewChanged
                              ? "bg-[#713746] text-white hover:-translate-y-0.5 hover:bg-[#8b4a5d] active:scale-95"
                              : "border border-[#e7d4cf] bg-white text-[#987c7c]"
                        }`}
                      >
                        {isSavingReview ? (
                          <><LoaderCircle size={15} className="animate-spin" /> Saving your thoughts...</>
                        ) : savedReviews.includes(selected.entry_id) ? (
                          <><Check size={15} /> Saved with love ♡</>
                        ) : reviewChanged ? (
                          <><Save size={15} /> Save my review</>
                        ) : (
                          <><Check size={15} /> Review saved</>
                        )}
                      </button>
                    );
                  })()}
                </section>
              </>
            ) : (
              <p className="py-2 text-center text-sm leading-6 text-[#987c7c]">
                Mark it as watched to rate it and write your little review ♡
              </p>
            )}

            <p className="mt-8 text-center font-display text-sm italic text-[#b18e80]">
              Every story leaves a little something ♡
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
