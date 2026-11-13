"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import Link from "next/link";
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
  Film,
  X,
  MoreHorizontal,
  Play,
  Tv,
  Save,
} from "lucide-react";

import Brand from "@/components/Brand";

/* ---------- types ---------- */

type Status = "watchlist" | "currently_watching" | "watched";

type Movie = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  original_language?: string;
};

type Entry = Movie & {
  entry_id: string;
  status: Status;
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

type Flash = { id: string; kind: "watched" | "started" } | null;
type Kind = "all" | "movie" | "tv";
type Sort = "recent" | "title" | "rating" | "year";

const supabase = createClient();

/* ---------- constants ---------- */

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

const statusLabels: Record<Status, string> = {
  watchlist: "On your watchlist",
  currently_watching: "Now playing",
  watched: "Watched",
};

const moveLabels: Record<Status, string> = {
  watchlist: "Move to watchlist",
  currently_watching: "Start watching",
  watched: "Mark as watched",
};

const statusOrder: Status[] = ["watchlist", "currently_watching", "watched"];

const tabs: [string, string][] = [
  ["watchlist", "Watchlist"],
  ["currently_watching", "Currently watching"],
  ["watched", "Watched"],
  ["favourites", "Favourites ♡"],
  ["all", "Everything"],
];

const emptyCopy: Record<string, { emoji: string; title: string; text: string }> = {
  watchlist: {
    emoji: "🍿 🌷",
    title: "Nothing waiting yet.",
    text: "Search for a title above and save it for a cosy night in.",
  },
  currently_watching: {
    emoji: "🎬 ✨",
    title: "Nothing playing right now.",
    text: "Press “Start watching” on a watchlist title to see it here.",
  },
  watched: {
    emoji: "🎞️ 🌸",
    title: "No finished stories yet.",
    text: "Mark a title as watched to rate it and write a review.",
  },
  favourites: {
    emoji: "💌 🌷",
    title: "No favourites yet.",
    text: "Tap the heart on any poster to keep it close.",
  },
  all: {
    emoji: "🎬 🌷",
    title: "A blank page, for now.",
    text: "Search for a title above and add it to your diary.",
  },
};

const searchHints = [
  "Search a film or series…",
  "Try “Pride & Prejudice”…",
  "Try “Spirited Away”…",
  "Try “Before Sunrise”…",
  "Try “Little Women”…",
];

const genreNames: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-fi",
  53: "Thriller",
  10752: "War",
  10759: "Action & Adventure",
  10765: "Sci-fi & Fantasy",
};

const sortLabels: Record<Sort, string> = {
  recent: "Recently added",
  title: "Title A–Z",
  rating: "Highest rated",
  year: "Newest release",
};

const petalSymbols = ["🌸", "🌷", "✿", "❀", "🍃"];

const heroWords = ["Every", "story", "leaves", "a", "little"];

/** Where each polaroid sits in the hero stack. The top slot has the highest z. */
const polaroidSlots = [
  { x: 0, y: 46, r: -9, z: 1 },
  { x: 74, y: 4, r: 3, z: 3 },
  { x: 142, y: 56, r: 10, z: 2 },
];

const burstVectors: [number, number][] = [
  [-30, -34],
  [0, -46],
  [30, -34],
  [-44, -6],
  [44, -6],
  [-24, 26],
  [24, 26],
];

/* ---------- helpers & hooks ---------- */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Types placeholder hints. Pauses while `active` is false. */
function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active) {
      setText("");
      return;
    }

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
  }, [phrases, active]);

  return text;
}

/** Eases a number toward its target. Returns a formatted string. */
function useCountUp(target: number, decimals: number, reduced: boolean) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduced) {
      current.current = target;
      setValue(target);
      return;
    }

    const start = current.current;
    const began = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - began) / 900, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return decimals ? value.toFixed(decimals) : Math.round(value).toString();
}

function handleTilt(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  el.style.setProperty("--ry", `${x * 12}deg`);
  el.style.setProperty("--rx", `${-y * 12}deg`);
  el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
  el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
}

function resetTilt(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--ry", "0deg");
  el.style.setProperty("--rx", "0deg");
}

function nextStatus(status: Status): Status {
  return status === "watchlist"
    ? "currently_watching"
    : status === "currently_watching"
      ? "watched"
      : "watchlist";
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
    <div className="flex w-full items-start gap-4 sm:gap-5">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-6">
          {column.map(({ item, index }) => render(item, index))}
        </div>
      ))}
    </div>
  );
}

/* ---------- small components ---------- */

function PosterImage({
  path,
  alt,
  size = 28,
}: {
  path: string;
  alt: string;
  size?: number;
}) {
  if (!path) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9] text-[#9b766f]">
        <Film size={size} />
      </div>
    );
  }

  return (
    <Image
      fill
      unoptimized
      src={`https://image.tmdb.org/t/p/w500${path}`}
      alt={alt}
      className="object-cover"
    />
  );
}

/** A tiny clapperboard whose arm snaps shut. */
function Clapper() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
      <g className="clap-arm">
        <rect x="6" y="12" width="52" height="12" rx="2.5" fill="#713746" />
        <polygon points="14,12 22,12 16,24 8,24" fill="#fffdfa" />
        <polygon points="30,12 38,12 32,24 24,24" fill="#fffdfa" />
        <polygon points="46,12 54,12 48,24 40,24" fill="#fffdfa" />
      </g>
      <rect
        x="6"
        y="27"
        width="52"
        height="26"
        rx="3"
        fill="#fffdfa"
        stroke="#713746"
        strokeWidth="3"
      />
      <path d="M14 38h22M14 45h14" stroke="#c77d91" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function HeartBurst() {
  return (
    <span className="burst" aria-hidden="true">
      {burstVectors.map(([x, y], index) => (
        <span
          key={index}
          className="burst-heart"
          style={
            {
              "--dx": `${x}px`,
              "--dy": `${y}px`,
              animationDelay: `${index * 25}ms`,
            } as CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </span>
  );
}

function StatCard({
  label,
  value,
  decimals = 0,
  icon,
  reduced,
  delay,
}: {
  label: string;
  value: number | null;
  decimals?: number;
  icon: ReactNode;
  reduced: boolean;
  delay: number;
}) {
  const shown = useCountUp(value ?? 0, decimals, reduced);

  return (
    <div
      className="reveal rounded-3xl border border-[#eadfd5] bg-white/70 px-5 py-4 backdrop-blur-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-3xl tabular-nums sm:text-4xl">
          {value === null ? "—" : shown}
        </span>
        <span className="text-[#c99aa4]">{icon}</span>
      </div>
      <p className="mt-1 text-xs text-[#987c7c]">{label}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition active:scale-95 ${
        active
          ? "border-[#713746] bg-[#713746] text-white shadow-sm"
          : "border-[#e6d6d0] bg-white/70 text-[#876d70] hover:border-[#b66c7c] hover:text-[#713746]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const reduced = usePrefersReducedMotion();

  const [userId, setUserId] = useState("");
  const [movies, setMovies] = useState<Entry[]>([]);
  const [results, setResults] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [tab, setTab] = useState("watchlist");
  const [kind, setKind] = useState<Kind>("all");
  const [genre, setGenre] = useState(0);
  const [hindiOnly, setHindiOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [busy, setBusy] = useState(false);
  const [openMenuId, setOpenMenuId] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [statusBusyId, setStatusBusyId] = useState("");
  const [reviewBusyId, setReviewBusyId] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [savedReviews, setSavedReviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [ratingPop, setRatingPop] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [favoritePop, setFavoritePop] = useState("");
  const [burstId, setBurstId] = useState("");
  const [petals, setPetals] = useState<Petal[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [linger, setLinger] = useState<Set<string>>(new Set());
  const [leavingId, setLeavingId] = useState("");
  const [shuffle, setShuffle] = useState(0);

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const petalCounter = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const placeholder = useTypewriter(
    searchHints,
    !reduced && !searchFocused && !query
  );

  const selected = movies.find((movie) => movie.entry_id === selectedId) ?? null;

  /* ---------- derived data ---------- */

  const counts = useMemo(
    () => ({
      watchlist: movies.filter((m) => m.status === "watchlist").length,
      currently_watching: movies.filter((m) => m.status === "currently_watching").length,
      watched: movies.filter((m) => m.status === "watched").length,
      favourites: movies.filter((m) => m.is_favorite).length,
      all: movies.length,
    }),
    [movies]
  );

  const countsKey = Object.values(counts).join("-");

  const averageRating = useMemo(() => {
    const rated = movies.filter((m) => m.rating);
    if (rated.length === 0) return null;
    return rated.reduce((sum, m) => sum + (m.rating ?? 0), 0) / rated.length;
  }, [movies]);

  const savedKeys = useMemo(
    () => new Set(movies.map((m) => `${m.media_type}-${m.id}`)),
    [movies]
  );

  /** Genres that actually appear in the collection, most common first. */
  const genreChips = useMemo(() => {
    const tally = new Map<number, number>();
    movies.forEach((m) =>
      m.genre_ids.forEach((id) => {
        if (genreNames[id]) tally.set(id, (tally.get(id) ?? 0) + 1);
      })
    );
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);
  }, [movies]);

  const filtersActive = kind !== "all" || genre !== 0 || hindiOnly;

  const matchesTab = (movie: Entry) =>
    tab === "all" ||
    (tab === "favourites" ? movie.is_favorite : movie.status === tab);

  const visible = useMemo(() => {
    const list = movies.filter((movie) => {
      const inTab =
        tab === "all" ||
        (tab === "favourites" ? movie.is_favorite : movie.status === tab) ||
        linger.has(movie.entry_id);
      const kindOk = kind === "all" || movie.media_type === kind;
      const languageOk = !hindiOnly || movie.original_language === "hi";
      const genreOk = genre === 0 || movie.genre_ids.includes(genre);
      return inTab && kindOk && languageOk && genreOk;
    });

    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "rating") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    if (sort === "year") {
      list.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
    }

    return list;
  }, [movies, tab, kind, genre, hindiOnly, sort, linger]);

  const stripItems = movies.filter((m) => m.poster_path).slice(0, 14);
  const reel =
    stripItems.length === 0
      ? []
      : Array.from({ length: Math.max(1, Math.ceil(10 / stripItems.length)) }, () => stripItems).flat();

  const collage: (Entry | null)[] = [0, 1, 2].map((i) => movies[i] ?? null);

  /* ---------- UI helpers ---------- */

  function showToast(text: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  function releasePetals() {
    if (reduced) return;

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

  /**
   * Plays a short stamp / clapperboard moment on a card. The card stays in the
   * current tab for a beat so the moment is actually seen, then poofs away.
   */
  function flashCard(id: string, type: "watched" | "started") {
    setFlash({ id, kind: type });
    setLinger((previous) => new Set(previous).add(id));

    window.setTimeout(() => setFlash(null), 1500);
    window.setTimeout(() => setLeavingId(id), 1500);
    window.setTimeout(() => {
      setLinger((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      setLeavingId("");
    }, 1880);
  }

  function clearFilters() {
    setKind("all");
    setGenre(0);
    setHindiOnly(false);
  }

  function clearSearch() {
    setResults([]);
    setQuery("");
    setMessage("");
  }

  /* ---------- effects ---------- */

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
  }, [tab, countsKey]);

  /* hero polaroids take turns on top */
  useEffect(() => {
    if (reduced || movies.length < 2) return;
    const timer = window.setInterval(() => setShuffle((s) => s + 1), 4200);
    return () => window.clearInterval(timer);
  }, [reduced, movies.length]);

  /* popup: Escape closes, body scroll locks, focus moves in */
  useEffect(() => {
    if (!selectedId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId("");
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedId]);

  /* card menu: close on outside click or Escape */
  useEffect(() => {
    if (!openMenuId) return;

    const close = () => {
      setOpenMenuId("");
      setConfirmRemoveId("");
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-card-menu]")) close();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

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
        original_language: row.original_language ?? "",
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

  /* ---------- actions ---------- */

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

    if (savedKeys.has(`${movie.media_type}-${movie.id}`)) {
      showToast("Already in your diary ♡");
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
      original_language: movie.original_language ?? null,
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

    if (!reduced) {
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 3000);
    }
  }

  async function changeStatus(movie: Entry, next: Status) {
    if (statusBusyId || movie.status === next) return;

    setStatusBusyId(movie.entry_id);
    setOpenMenuId("");
    setConfirmRemoveId("");

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
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id ? { ...item, status: next } : item
        )
      );

      if (next === "watched") {
        releasePetals();
        flashCard(movie.entry_id, "watched");
      } else if (next === "currently_watching") {
        flashCard(movie.entry_id, "started");
      }

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
    const previousRating = movie.rating;

    setRatingPop(movie.entry_id);
    setMovies((previous) =>
      previous.map((item) =>
        item.entry_id === movie.entry_id ? { ...item, rating } : item
      )
    );
    window.setTimeout(() => setRatingPop(""), 450);

    const { error } = await supabase
      .from("movie_entries")
      .update({ rating })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id
            ? { ...item, rating: previousRating }
            : item
        )
      );
      return;
    }

    showToast(`${rating}/5 — ${ratingLabels[rating - 1]} ✨`);
  }

  async function toggleFavorite(movie: Entry) {
    const next = !movie.is_favorite;

    setFavoritePop(movie.entry_id);
    window.setTimeout(() => setFavoritePop(""), 450);

    if (next) {
      setBurstId(movie.entry_id);
      window.setTimeout(() => setBurstId(""), 900);
    }

    setMovies((previous) =>
      previous.map((item) =>
        item.entry_id === movie.entry_id ? { ...item, is_favorite: next } : item
      )
    );

    const { error } = await supabase
      .from("movie_entries")
      .update({ is_favorite: next })
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
      setMovies((previous) =>
        previous.map((item) =>
          item.entry_id === movie.entry_id
            ? { ...item, is_favorite: !next }
            : item
        )
      );
      return;
    }

    showToast(next ? "Added to your favourites ♡" : "Removed from favourites");
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
    setOpenMenuId("");
    setConfirmRemoveId("");
    setRemovingId(movie.entry_id);

    if (!reduced) await new Promise((resolve) => setTimeout(resolve, 380));

    const { error } = await supabase
      .from("movie_entries")
      .delete()
      .eq("id", movie.entry_id);

    if (error) {
      setMessage(error.message);
      setRemovingId("");
      return;
    }

    if (selectedId === movie.entry_id) setSelectedId("");
    setMovies((previous) =>
      previous.filter((item) => item.entry_id !== movie.entry_id)
    );
    setRemovingId("");
    showToast(`${movie.title} removed from your diary`);
  }

  /* ---------- render ---------- */

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#faf5ed] px-4 pb-8 pt-5 text-[#633747] sm:px-6 sm:pt-7 md:px-10">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&display=swap");

        .font-display {
          font-family: "Fraunces", Georgia, serif;
          font-variation-settings: "SOFT" 100;
        }

        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

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
          transform: translateX(-50%);
          animation: toast-appear 3s ease-in-out forwards;
          pointer-events: none;
        }
        .heart-pop { animation: heart-pop .45s ease-out; }
        .star-pop { animation: star-pop .35s ease-out; }

        /* ---------- heart burst when you favourite ---------- */
        .burst {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .burst-heart {
          position: absolute;
          left: -7px;
          top: -9px;
          font-size: 14px;
          color: #c04d70;
          opacity: 0;
          animation: burst-fly .8s ease-out forwards;
        }
        @keyframes burst-fly {
          0% { opacity: 0; transform: translate(0, 0) scale(.3); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.15) rotate(18deg); }
        }

        /* ---------- stamp + clapperboard moments ---------- */
        .flash-layer {
          position: absolute;
          inset: 0;
          z-index: 15;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(53, 43, 39, 0.34);
          pointer-events: none;
          animation: flash-bg 1.5s ease forwards;
        }
        @keyframes flash-bg {
          0% { opacity: 0; }
          12%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .stamp {
          border: 3px solid #fffdfa;
          border-radius: 0.7rem;
          background: rgba(182, 108, 124, 0.88);
          color: #fffdfa;
          padding: 0.35rem 0.85rem;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          transform: rotate(-12deg);
          animation: stamp-in 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both;
        }
        @keyframes stamp-in {
          0% { opacity: 0; transform: scale(2.4) rotate(-26deg); }
          60% { opacity: 1; transform: scale(0.92) rotate(-12deg); }
          100% { opacity: 1; transform: scale(1) rotate(-12deg); }
        }
        .action-pop {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          color: #fffdfa;
          animation: action-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both;
        }
        @keyframes action-in {
          from { opacity: 0; transform: scale(0.5) translateY(14px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .clap-arm {
          transform-origin: 8px 24px;
          animation: clap 1s ease-in-out both;
        }
        @keyframes clap {
          0%, 30% { transform: rotate(-32deg); }
          48% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        /* ---------- cards leaving ---------- */
        .poof { animation: poof 0.38s ease-in forwards; pointer-events: none; }
        @keyframes poof {
          to { opacity: 0; transform: scale(0.7) rotate(-4deg); filter: blur(6px); }
        }
        .wiggle { animation: wiggle 0.4s ease-in-out; }
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        /* ---------- live dot on "now playing" ---------- */
        .live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 5px;
          border-radius: 9999px;
          background: #c04d70;
          animation: live-pulse 1.4s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.45; }
        }

        /* ---------- skeletons ---------- */
        .skeleton {
          aspect-ratio: 2 / 3;
          border-radius: 1.5rem;
          background: linear-gradient(100deg, #f1e4dc 30%, #fbf3ee 50%, #f1e4dc 70%);
          background-size: 250% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          from { background-position: 100% 0; }
          to { background-position: -100% 0; }
        }

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

        /* ---------- polaroid stack that shuffles ---------- */
        .polaroid-slot {
          position: absolute;
          left: 0;
          top: 0;
          width: 138px;
          transition: transform 0.9s cubic-bezier(0.3, 1.25, 0.4, 1);
        }
        .polaroid {
          position: relative;
          padding: 8px 8px 26px;
          border-radius: 6px;
          background: #fffdfa;
          box-shadow: 0 16px 30px rgba(91, 58, 48, 0.2);
          animation: pin-float 6s ease-in-out infinite;
        }
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
          z-index: 1;
        }
        @keyframes pin-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-9px) rotate(1.5deg); }
        }

        /* ---------- film strip that scrolls your posters ---------- */
        .filmstrip {
          position: relative;
          overflow: hidden;
          border-radius: 0.9rem;
          background: #7a4656;
          padding: 16px 0;
          box-shadow: 0 10px 24px rgba(91, 58, 48, 0.18);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .filmstrip::before,
        .filmstrip::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 6px;
          background: repeating-linear-gradient(90deg, #faf5ed 0 9px, transparent 9px 20px);
          opacity: 0.9;
        }
        .filmstrip::before { top: 5px; }
        .filmstrip::after { bottom: 5px; }
        .filmstrip-track {
          display: flex;
          width: max-content;
          gap: 10px;
          animation: reel linear infinite;
        }
        .filmstrip:hover .filmstrip-track { animation-play-state: paused; }
        @keyframes reel {
          to { transform: translateX(-50%); }
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
        .pin-card:focus-within .pin-actions,
        .pin-actions.keep { opacity: 1; transform: translateY(0); }
        @media (hover: none) {
          .pin-actions { opacity: 1; transform: none; }
        }

        /* Every poster frame has the same outer 2:3 dimensions. */
        .poster-frame {
          position: relative;
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 2 / 3;
          box-sizing: border-box;
          overflow: hidden;
          flex: none;
        }

        .poster-frame > .tilt {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        /* now playing: soft pastel ring chases around the same fixed-size frame */
        @property --marquee-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes marquee-chase { to { --marquee-angle: 360deg; } }
        .now-playing {
          box-sizing: border-box;
          padding: 3px;
          border-radius: 1.15rem;
          background: conic-gradient(from var(--marquee-angle), #f2c3b8, #d9c5ee, #cfe0bd, #f5dba3, #f2c3b8);
          animation: marquee-chase 5s linear infinite;
          box-shadow: 0 8px 26px rgba(198, 140, 160, 0.35);
        }
        /* the padding is the ring, so inset the poster by the same amount */
        .poster-frame.now-playing > .tilt {
          inset: 3px;
          width: auto;
          height: auto;
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
          .success-toast, .heart-pop, .star-pop, .aurora span, .polaroid,
          .glow-border, .now-playing, .modal-pop, .live-dot, .skeleton,
          .filmstrip-track, .burst-heart, .clap-arm, .stamp, .action-pop,
          .flash-layer, .wiggle { animation: none; }
          .sparkle, .petal, .burst { display: none; }
          .poof { animation: none; opacity: 0; }
          .hero-word, .hero-fade, .reveal {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .tilt { transform: none; }
          .polaroid-slot, .tab-pill { transition: none; }
          .flash-layer { opacity: 1; }
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
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Brand />

          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full items-center justify-center gap-1 rounded-full border border-[#eadbd2] bg-white/70 p-1 shadow-sm backdrop-blur-sm sm:order-none sm:ml-auto sm:w-auto"
          >
            <Link
              href="/cinema"
              aria-current="page"
              className="rounded-full bg-[#713746] px-4 py-2 text-xs font-medium text-white shadow-sm sm:text-sm"
            >
              Films
            </Link>
            <Link
              href="/library"
              className="rounded-full px-4 py-2 text-xs font-medium text-[#65705c] transition hover:bg-[#edf0e8] sm:text-sm"
            >
              Books
            </Link>
          </nav>

          <Link
            href="/login"
            className="min-h-11 shrink-0 rounded-full bg-[#713746] px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d] hover:shadow-lg sm:px-5 sm:text-base"
          >
            {userId ? "Account ♡" : "Sign in ♡"}
          </Link>
        </header>

        <section className="mx-auto max-w-6xl py-9 sm:py-12 md:py-14">
          {/* Hero */}
          <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
            <div>
              <p
                className="hero-fade mb-4 text-sm text-[#a26f79]"
                style={{ animationDelay: "0.1s" }}
              >
                Your personal film diary
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

            {/* pinned polaroids: they take turns on top */}
            <div
              className="relative hidden h-64 w-72 shrink-0 sm:block"
              aria-hidden="true"
            >
              {collage.map((movie, index) => {
                const slot = polaroidSlots[(index + shuffle) % 3];

                return (
                  <div
                    key={movie?.entry_id ?? `placeholder-${index}`}
                    className="polaroid-slot"
                    style={{
                      transform: `translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg)`,
                      zIndex: slot.z,
                    }}
                  >
                    <div
                      className="polaroid"
                      style={{ animationDelay: `${-index * 1.7}s` }}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-sm">
                        <PosterImage path={movie?.poster_path ?? ""} alt="" />
                      </div>
                      <p className="absolute inset-x-2 bottom-1.5 truncate text-center font-display text-[10px] italic text-[#9b766f]">
                        {movie?.title ?? "your next favourite"}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={placeholder || "Search a film or series…"}
                aria-label="Search movies or TV shows"
                className="min-w-0 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-[#b49a9c] sm:px-2"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="shrink-0 rounded-full p-2 text-[#b49a9c] transition hover:bg-[#f4eee8] hover:text-[#713746]"
                >
                  <X size={16} />
                </button>
              )}
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

          {/* Skeletons while searching */}
          {busy && (
            <div
              className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5"
              aria-hidden="true"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="skeleton" />
              ))}
            </div>
          )}

          {/* Search results as a masonry board */}
          {results.length > 0 && (
            <section className="mt-10">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl">Found for you ♡</h2>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-full border border-[#e6d6d0] bg-white/70 px-4 py-1.5 text-xs text-[#876d70] transition hover:border-[#b66c7c] hover:text-[#713746]"
                >
                  Clear results
                </button>
              </div>

              <Masonry
                items={results}
                render={(movie, index) => {
                  const isSaved = savedKeys.has(`${movie.media_type}-${movie.id}`);

                  return (
                    <div
                      key={`${movie.media_type}-${movie.id}`}
                      className="reveal w-full"
                      style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}
                    >
                      <article className="pin-card">
                        <div
                          className="tilt poster-frame w-full rounded-3xl bg-[#ead9d1] shadow-md"
                          onMouseMove={handleTilt}
                          onMouseLeave={resetTilt}
                        >
                          <PosterImage path={movie.poster_path} alt={`${movie.title} poster`} />

                          {movie.media_type === "tv" && (
                            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium text-[#713746] shadow-sm">
                              <Tv size={12} /> Series
                            </span>
                          )}

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
                          disabled={isSaved}
                          className={`mt-3 min-h-11 w-full rounded-full border px-2 py-2 text-xs transition active:scale-95 sm:text-sm ${
                            isSaved
                              ? "border-[#cdd6c4] bg-[#edf2e9] text-[#52634a]"
                              : "border-[#d9b9b6] bg-white/60 hover:bg-[#f0dfd7]"
                          }`}
                        >
                          {isSaved ? "✓ In your diary" : "+ Add to watchlist"}
                        </button>
                      </article>
                    </div>
                  );
                }}
              />
            </section>
          )}

          {/* Film strip of your own posters */}
          {reel.length > 0 && (
            <div className="mt-14 sm:mt-16" aria-hidden="true">
              <div className="filmstrip">
                <div
                  className="filmstrip-track"
                  style={{ animationDuration: `${reel.length * 2 * 3}s` }}
                >
                  {[...reel, ...reel].map((movie, index) => (
                    <div
                      key={`${movie.entry_id}-${index}`}
                      className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded-[3px] bg-[#ead9d1]"
                    >
                      <PosterImage path={movie.poster_path} alt="" size={16} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Collection */}
          <section className="mt-10 sm:mt-14">
            <h2 className="font-display text-3xl sm:text-4xl">
              Your little collection
            </h2>

            {/* Stats */}
            {userId && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="in your diary"
                  value={counts.all}
                  icon={<Film size={20} />}
                  reduced={reduced}
                  delay={0}
                />
                <StatCard
                  label="watched"
                  value={counts.watched}
                  icon={<Check size={20} />}
                  reduced={reduced}
                  delay={80}
                />
                <StatCard
                  label="favourites"
                  value={counts.favourites}
                  icon={<Heart size={20} />}
                  reduced={reduced}
                  delay={160}
                />
                <StatCard
                  label="average petals"
                  value={averageRating}
                  decimals={1}
                  icon={<Flower2 size={20} />}
                  reduced={reduced}
                  delay={240}
                />
              </div>
            )}

            {/* Tabs with a sliding pill */}
            <div className="no-scrollbar -mx-4 mb-5 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
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
                    <span>{label}</span>
                    <span className={`ml-1 tabular-nums ${tab === value ? "text-white/80" : "text-[#ad9990]"}`}>
                      {counts[value as keyof typeof counts]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters + sort */}
            {userId && movies.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-2">
                <div className="no-scrollbar -mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                  <Chip active={kind === "all"} onClick={() => setKind("all")}>
                    All
                  </Chip>
                  <Chip active={kind === "movie"} onClick={() => setKind("movie")}>
                    Films
                  </Chip>
                  <Chip active={kind === "tv"} onClick={() => setKind("tv")}>
                    Series
                  </Chip>

                  <span className="mx-1 h-5 w-px shrink-0 bg-[#e6d6d0]" aria-hidden="true" />

                  <Chip active={hindiOnly} onClick={() => setHindiOnly((v) => !v)}>
                    Hindi
                  </Chip>

                  {genreChips.length > 0 && (
                    <span className="mx-1 h-5 w-px shrink-0 bg-[#e6d6d0]" aria-hidden="true" />
                  )}

                  {genreChips.map((id) => (
                    <Chip
                      key={id}
                      active={genre === id}
                      onClick={() => setGenre(genre === id ? 0 : id)}
                    >
                      {genreNames[id]}
                    </Chip>
                  ))}
                </div>

                <label className="flex shrink-0 items-center gap-2 text-xs text-[#987c7c]">
                  <span className="sr-only sm:not-sr-only">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="min-h-9 rounded-full border border-[#e6d6d0] bg-white/70 px-3 py-1.5 text-xs text-[#876d70] outline-none focus:border-[#b66c7c]"
                  >
                    {(Object.keys(sortLabels) as Sort[]).map((value) => (
                      <option key={value} value={value}>
                        {sortLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {!userId ? (
              <div className="rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center backdrop-blur-sm sm:p-12">
                <Heart className="mx-auto mb-4 animate-bounce text-[#b66c7c]" size={30} />
                <h3 className="font-display text-2xl">Your stories belong here.</h3>
                <p className="mt-2 text-sm">Sign in to save your personal collection.</p>
                <Link
                  href="/login"
                  className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#713746] px-6 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d]"
                >
                  Sign in ♡
                </Link>
              </div>
            ) : visible.length === 0 ? (
              <div
                key={`${tab}-${filtersActive}`}
                className="reveal rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center backdrop-blur-sm sm:p-12"
              >
                {filtersActive && counts[tab as keyof typeof counts] > 0 ? (
                  <>
                    <p className="animate-bounce text-4xl">🔍 🌸</p>
                    <h3 className="mt-4 font-display text-2xl">Nothing matches those filters.</h3>
                    <p className="mt-2 text-sm">Try fewer filters to see more of this shelf.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-5 min-h-11 rounded-full border border-[#d9b9b6] bg-white px-6 py-2 text-sm transition hover:bg-[#f0dfd7] active:scale-95"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="animate-bounce text-4xl">{emptyCopy[tab].emoji}</p>
                    <h3 className="mt-4 font-display text-2xl">{emptyCopy[tab].title}</h3>
                    <p className="mt-2 text-sm">{emptyCopy[tab].text}</p>
                  </>
                )}
              </div>
            ) : (
              <Masonry
                key={`${tab}-${kind}-${genre}-${hindiOnly}-${sort}`}
                items={visible}
                render={(movie, index) => {
                  const isSavingStatus = statusBusyId === movie.entry_id;
                  const playing = movie.status === "currently_watching";
                  const menuOpen = openMenuId === movie.entry_id;
                  const leaving =
                    removingId === movie.entry_id ||
                    (leavingId === movie.entry_id && !matchesTab(movie));
                  const flashing = flash?.id === movie.entry_id ? flash : null;

                  return (
                    <div
                      key={movie.entry_id}
                      className="reveal w-full"
                      style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}
                    >
                      <article
                        className={`pin-card relative w-full min-w-0 ${leaving ? "poof" : ""}`}
                      >
                        <div className="relative">
                          <div className={`poster-frame ${playing ? "now-playing" : ""}`}>
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
                              className={`tilt relative h-full w-full cursor-pointer overflow-hidden ${
                                playing ? "rounded-[0.9rem]" : "rounded-3xl"
                              } bg-[#ead9d1] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-4`}
                              onMouseMove={handleTilt}
                              onMouseLeave={resetTilt}
                            >
                              <PosterImage path={movie.poster_path} alt={movie.title} />

                              {movie.media_type === "tv" && (
                                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium text-[#713746] shadow-sm">
                                  <Tv size={12} /> Series
                                </span>
                              )}

                              {playing && (
                                <span
                                  className={`absolute ${movie.media_type === "tv" ? "left-3 top-10" : "left-3 top-3"} z-10 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] text-[#87505e] shadow-sm`}
                                >
                                  <span className="live-dot" />
                                  Now playing
                                </span>
                              )}

                              {movie.status === "watched" && movie.rating && (
                                <span className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] text-[#87505e] shadow-sm">
                                  <Flower2 size={12} fill="currentColor" />
                                  {movie.rating}
                                </span>
                              )}

                              {flashing && (
                                <div className="flash-layer" aria-hidden="true">
                                  {flashing.kind === "watched" ? (
                                    <span className="stamp">WATCHED ♡</span>
                                  ) : (
                                    <div className="action-pop">
                                      <Clapper />
                                      <span className="font-display text-lg italic">Action!</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* favourite heart (outside the poster so the burst isn't clipped) */}
                          <div
                            className={`pin-actions absolute right-3 top-3 z-20 ${
                              movie.is_favorite ? "keep" : ""
                            }`}
                          >
                            <button
                              onClick={() => toggleFavorite(movie)}
                              title={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                              aria-label={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                              aria-pressed={movie.is_favorite}
                              className={`relative rounded-full p-2 shadow-md transition-all duration-200 hover:scale-110 active:scale-90 ${
                                movie.is_favorite
                                  ? "bg-[#fbe8ed] text-[#c04d70]"
                                  : "bg-white/95 text-[#bda1a4] hover:text-[#c04d70]"
                              } ${favoritePop === movie.entry_id ? "heart-pop" : ""}`}
                            >
                              <Heart size={19} fill={movie.is_favorite ? "currentColor" : "none"} />
                              {burstId === movie.entry_id && <HeartBurst />}
                            </button>
                          </div>

                          {/* card menu */}
                          <div
                            data-card-menu
                            className="pin-actions absolute bottom-3 left-3 z-30"
                            style={menuOpen ? { opacity: 1, transform: "none" } : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmRemoveId("");
                                setOpenMenuId(menuOpen ? "" : movie.entry_id);
                              }}
                              aria-label={`More options for ${movie.title}`}
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              className="rounded-full bg-white/95 p-2 text-[#876d70] shadow-md transition hover:bg-white hover:text-[#713746] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c]"
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {menuOpen && (
                              <div
                                role="menu"
                                className="modal-pop absolute bottom-11 left-0 w-48 overflow-hidden rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-1.5 shadow-xl"
                              >
                                {statusOrder
                                  .filter((status) => status !== movie.status)
                                  .map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => changeStatus(movie, status)}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-[#713746] transition hover:bg-[#f8ecec]"
                                    >
                                      {status === "watched" ? (
                                        <Check size={14} />
                                      ) : status === "currently_watching" ? (
                                        <Play size={14} />
                                      ) : (
                                        <Film size={14} />
                                      )}
                                      {moveLabels[status]}
                                    </button>
                                  ))}

                                <div className="my-1 border-t border-[#f0e6dd]" />

                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    confirmRemoveId === movie.entry_id
                                      ? void deleteMovie(movie)
                                      : setConfirmRemoveId(movie.entry_id)
                                  }
                                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                                    confirmRemoveId === movie.entry_id
                                      ? "wiggle bg-[#f8dfe3] text-[#9b3d54]"
                                      : "text-[#9b5363] hover:bg-[#f8ecec]"
                                  }`}
                                >
                                  <Trash2 size={14} />
                                  {confirmRemoveId === movie.entry_id
                                    ? "Tap again to remove"
                                    : "Remove from diary"}
                                </button>
                              </div>
                            )}
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

                        {movie.status === "watched" ? (
                          <button
                            onClick={() => setSelectedId(movie.entry_id)}
                            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[#65705c] bg-[#edf2e9] px-2 py-2 text-xs font-medium text-[#52634a] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:gap-2 sm:px-3 sm:text-sm"
                          >
                            <Check size={16} />
                            {movie.rating ? "Watched ♡" : "Rate & review"}
                          </button>
                        ) : (
                          <button
                            onClick={() => changeStatus(movie, nextStatus(movie.status))}
                            disabled={Boolean(statusBusyId)}
                            className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs font-medium transition-all duration-200 disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm ${
                              playing
                                ? "border-[#b66c7c] bg-[#f8e8ec] text-[#713746] hover:-translate-y-0.5 active:scale-95"
                                : "border-[#713746] bg-[#713746] text-white hover:-translate-y-0.5 hover:bg-[#8b4a5d] active:scale-95"
                            }`}
                          >
                            {isSavingStatus ? (
                              <>
                                <LoaderCircle size={16} className="animate-spin" /> Saving...
                              </>
                            ) : playing ? (
                              <>
                                <Check size={16} /> Mark as watched
                              </>
                            ) : (
                              <>
                                <Play size={16} fill="currentColor" /> Start watching
                              </>
                            )}
                          </button>
                        )}
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
              ref={closeRef}
              onClick={() => setSelectedId("")}
              aria-label="Close details"
              className="absolute right-5 top-5 z-10 rounded-full bg-[#f4eee8] p-2 text-[#8d776b] transition hover:rotate-90 hover:bg-[#eadfd5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c]"
            >
              <X size={18} />
            </button>

            <div className="flex gap-5 pr-8 sm:gap-7">
              <div
                className="tilt relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-[#ead9d1] shadow-xl sm:w-36"
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
              >
                <PosterImage path={selected.poster_path} alt={selected.title} size={30} />
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

                  <div
                    className="flex items-center gap-1"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((petal) => {
                      const lit = petal <= (hoverRating || selected.rating || 0);

                      return (
                        <button
                          key={petal}
                          onClick={() => rateMovie(selected, petal)}
                          onMouseEnter={() => setHoverRating(petal)}
                          onFocus={() => setHoverRating(petal)}
                          onBlur={() => setHoverRating(0)}
                          aria-label={`Rate ${petal} out of 5 petals`}
                          title={`${petal} out of 5 petals`}
                          className={`rounded-full p-1.5 transition duration-200 hover:-rotate-12 hover:scale-125 active:scale-90 ${
                            ratingPop === selected.entry_id && petal <= (selected.rating ?? 0)
                              ? "star-pop"
                              : ""
                          } ${lit ? "text-[#c77d91]" : "text-[#ddc9bc]"}`}
                        >
                          <Flower2
                            size={28}
                            strokeWidth={1.8}
                            fill={lit ? "currentColor" : "none"}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2 min-h-5 text-xs text-[#89515f]">
                    {hoverRating
                      ? ratingLabels[hoverRating - 1]
                      : selected.rating
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
                          <>
                            <LoaderCircle size={15} className="animate-spin" /> Saving your thoughts...
                          </>
                        ) : savedReviews.includes(selected.entry_id) ? (
                          <>
                            <Check size={15} /> Saved with love ♡
                          </>
                        ) : reviewChanged ? (
                          <>
                            <Save size={15} /> Save my review
                          </>
                        ) : (
                          <>
                            <Check size={15} /> Review saved
                          </>
                        )}
                      </button>
                    );
                  })()}
                </section>
              </>
            ) : (
              <div className="py-2 text-center">
                <p className="text-sm leading-6 text-[#987c7c]">
                  Mark it as watched to rate it and write your little review ♡
                </p>
                <button
                  onClick={() => changeStatus(selected, "watched")}
                  disabled={Boolean(statusBusyId)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#713746] px-6 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d] active:scale-95 disabled:opacity-60"
                >
                  {statusBusyId === selected.entry_id ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Mark as watched
                    </>
                  )}
                </button>
              </div>
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