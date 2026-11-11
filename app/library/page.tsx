"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Heart,
  Loader2,
  Minus,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  Star,
  X,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Brand from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";
import SleepyCat from "@/components/SleepyCat";
import MagicalMushrooms from "@/components/MagicalMushrooms";

/* ---------- types ---------- */

type Shelf = "Want to read" | "Currently reading" | "Read";
type ShelfTab = Shelf | "Favourites";
type Sort = "recent" | "title" | "author" | "rating" | "year";

type Book = {
  id: string;
  title: string;
  authors: string[];
  publishedYear?: number | null;
  coverId?: number | null;
  coverUrl?: string | null;
  isbn?: string;
  publisher?: string;
  pageCount?: number | null;
};

type SavedBook = Book & {
  shelf: Shelf;
  rating: number | null;
  review: string | null;
  isFavorite: boolean;
  startedOn: string | null;
  finishedOn: string | null;
};

type Petal = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  symbol: string;
};

type Flash = { id: string; kind: "finished" | "started" } | null;
type Toast = { text: string; tone: "ok" | "error" } | null;

/* ---------- constants ---------- */

const shelves: ShelfTab[] = [
  "Want to read",
  "Currently reading",
  "Read",
  "Favourites",
];

const moveShelves: Shelf[] = ["Want to read", "Currently reading", "Read"];

const searchHints = [
  "Search for a book…",
  "Try “Pride and Prejudice”…",
  "Try “Haruki Murakami”…",
  "Try “a cosy mystery”…",
  "Try “Jane Austen”…",
];

const ratingLabels = [
  "Not for me",
  "It was okay",
  "Liked it",
  "Loved it",
  "A forever favourite",
];

const sortLabels: Record<Sort, string> = {
  recent: "Recently added",
  title: "Title A–Z",
  author: "Author A–Z",
  rating: "Highest rated",
  year: "Newest published",
};

const emptyCopy: Record<ShelfTab, { title: string; text: string }> = {
  "Want to read": {
    title: "A little room for a new story",
    text: "Search for a book above and add it to your shelf.",
  },
  "Currently reading": {
    title: "Nothing open on the nightstand",
    text: "Move a book here whenever you start reading.",
  },
  Read: {
    title: "No finished stories yet",
    text: "The books you've finished will appear here.",
  },
  Favourites: {
    title: "No favourites just yet",
    text: "Tap the little heart on a book to save it here.",
  },
};

const petalSymbols = ["🌹", "🌸", "✿", "❀", "🍃"];

/** Where each cover sits in the hero fan. The top slot has the highest z. */
const fanSlots = [
  { x: 0, y: 38, r: -13, z: 1 },
  { x: 62, y: 6, r: 2, z: 3 },
  { x: 124, y: 44, r: 14, z: 2 },
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

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

/** Eases a number toward its target (from where it currently is). */
function useCountUp(target: number, reduced: boolean, duration = 900) {
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
      const progress = Math.min((now - began) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;
      current.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, duration]);

  return Math.round(value);
}

/** Types and erases a list of phrases, for the search placeholder. */
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

/** 3D tilt + moving shine that follows the cursor */
function handleTilt(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  el.style.setProperty("--ry", `${x * 16}deg`);
  el.style.setProperty("--rx", `${-y * 16}deg`);
  el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
  el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
}

function resetTilt(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--ry", "0deg");
  el.style.setProperty("--rx", "0deg");
}

/* ---------- small components ---------- */

/** Cover image with a graceful fallback if the URL is missing or broken. */
function Cover({
  url,
  title,
  author,
  detailed = false,
}: {
  url?: string | null;
  title: string;
  author?: string;
  detailed?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9] px-3 text-center">
        <BookOpen size={detailed ? 30 : 26} className="text-[#9b766f]" />
        {detailed && (
          <>
            <span className="line-clamp-4 font-display text-sm text-[#633747]">
              {title}
            </span>
            <span className="line-clamp-1 text-[10px] text-[#8c7770]">
              {author || "A little story"}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={detailed ? `${title} book cover` : ""}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

/** An open book whose page turns. */
function OpenBook() {
  return (
    <svg viewBox="0 0 64 48" width="62" height="46" aria-hidden="true">
      <path
        d="M32 10C24 5 12 5 4 8v32c8-3 20-3 28 2 8-5 20-5 28-2V8c-8-3-20-3-28 2z"
        fill="#fffdfa"
        stroke="#713746"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M32 10v32" stroke="#713746" strokeWidth="3" />
      <g className="page-flip">
        <path
          d="M32 10C38 6 46 6 54 8v30c-8-2-16-2-22 3z"
          fill="#f4e3d9"
          stroke="#b66c7c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
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

/** Yearly reading goal: a ring that fills as you finish books. */
function GoalCard({
  done,
  goal,
  pages,
  reduced,
  onChange,
}: {
  done: number;
  goal: number;
  pages: number;
  reduced: boolean;
  onChange: (next: number) => void;
}) {
  const shown = useCountUp(done, reduced);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(done / goal, 1);
  const reached = done >= goal;
  const remaining = Math.max(goal - done, 0);
  const monthsLeft = 12 - new Date().getMonth();
  const perMonth = Math.ceil(remaining / monthsLeft);

  return (
    <div
      className="stat-card mt-3 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl border border-white/70 bg-white/55 px-5 py-4 backdrop-blur-md sm:mt-4"
      style={{ animationDelay: "360ms" }}
    >
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="goal-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94766b" />
              <stop offset="100%" stopColor="#c77d91" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#efe2da" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="url(#goal-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="goal-ring"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums text-[#633747]">
          {shown}
        </span>
      </div>

      <div className="min-w-0 flex-1 basis-48">
        <p className="font-display text-xl text-[#51463e]">
          {new Date().getFullYear()} reading goal
        </p>
        <p className="mt-1 text-sm text-[#8c7a6f]">
          {reached
            ? "Goal reached. What a year of stories! 🌹"
            : `${remaining} to go · about ${perMonth} a month`}
        </p>
        {pages > 0 && (
          <p className="mt-0.5 text-xs text-[#8c7a6f]">
            {pages.toLocaleString("en-IN")} pages turned this year
          </p>
        )}
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Yearly goal">
        <button
          type="button"
          onClick={() => onChange(goal - 1)}
          disabled={goal <= 1}
          aria-label="Lower yearly goal"
          className="rounded-full border border-[#e6d6d0] bg-white p-2 text-[#876d70] transition hover:border-[#b66c7c] hover:text-[#713746] active:scale-90 disabled:opacity-40"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-[4.75rem] text-center text-sm tabular-nums text-[#65564c]">
          {goal} books
        </span>
        <button
          type="button"
          onClick={() => onChange(goal + 1)}
          disabled={goal >= 200}
          aria-label="Raise yearly goal"
          className="rounded-full border border-[#e6d6d0] bg-white p-2 text-[#876d70] transition hover:border-[#b66c7c] hover:text-[#713746] active:scale-90 disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function LibraryPage() {
  const supabase = useMemo(() => createClient(), []);
  const reduced = usePrefersReducedMotion();

  const [userId, setUserId] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [collection, setCollection] = useState<SavedBook[]>([]);
  const [activeShelf, setActiveShelf] = useState<ShelfTab>("Want to read");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [openMenuBookId, setOpenMenuBookId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [shake, setShake] = useState(false);

  const [shelfQuery, setShelfQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingBook, setAddingBook] = useState<string | null>(null);
  const [updatingBook, setUpdatingBook] = useState<string | null>(null);

  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [petals, setPetals] = useState<Petal[]>([]);

  const [flash, setFlash] = useState<Flash>(null);
  const [linger, setLinger] = useState<Set<string>>(new Set());
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const [favoritePop, setFavoritePop] = useState<string | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [ratingPop, setRatingPop] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const [goal, setGoal] = useState(12);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(0);

  const petalCounter = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadedOnce = useRef(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const placeholder = useTypewriter(
    searchHints,
    !reduced && !searchFocused && !searchQuery
  );

  const selectedBook =
    collection.find((book) => book.id === selectedBookId) || null;

  /* ---------- UI helpers ---------- */

  const notify = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, tone });
    toastTimer.current = setTimeout(
      () => setToast(null),
      tone === "error" ? 5000 : 3200
    );
  }, []);

  function releasePetals() {
    if (reduced) return;

    const batch: Petal[] = Array.from({ length: 26 }, () => ({
      id: petalCounter.current++,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 3.5 + Math.random() * 3,
      size: 16 + Math.random() * 18,
      symbol: petalSymbols[Math.floor(Math.random() * petalSymbols.length)],
    }));

    setPetals((previous) => [...previous, ...batch]);

    setTimeout(() => {
      const ids = new Set(batch.map((petal) => petal.id));
      setPetals((previous) => previous.filter((petal) => !ids.has(petal.id)));
    }, 8000);
  }

  /**
   * Plays a short stamp / open-book moment on a card. The card stays on the
   * current shelf for a beat so the moment is actually seen, then poofs away.
   */
  function flashCard(id: string, kind: "finished" | "started") {
    setFlash({ id, kind });
    setLinger((previous) => new Set(previous).add(id));

    setTimeout(() => setFlash(null), 1500);
    setTimeout(() => setLeavingId(id), 1500);
    setTimeout(() => {
      setLinger((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      setLeavingId(null);
    }, 1880);
  }

  function changeGoal(next: number) {
    const value = Math.min(200, Math.max(1, next));
    setGoal(value);
    try {
      window.localStorage.setItem("reading-goal", String(value));
    } catch {
      /* storage can be unavailable (private mode); the goal just won't persist */
    }
  }

  /* ---------- data ---------- */

  const loadCollection = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    setLoadError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSignedOut(true);
      setUserId("");
      setCollection([]);
      setLoading(false);
      return;
    }

    setSignedOut(false);
    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("book_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setLoadError("Couldn't load your library. Please try again.");
      setLoading(false);
      return;
    }

    const books: SavedBook[] = (data || []).map((row) => ({
      id: row.openlibrary_id,
      title: row.title,
      authors: row.authors || [],
      publishedYear: row.published_year,
      coverId: row.cover_id,
      coverUrl: row.cover_url,
      isbn: row.isbn || "",
      publisher: row.publisher || "",
      pageCount: row.page_count,
      shelf: row.shelf as Shelf,
      rating: row.rating,
      review: row.review,
      isFavorite: row.is_favorite ?? false,
      startedOn: row.started_on || null,
      finishedOn: row.finished_on || null,
    }));

    setCollection(books);
    loadedOnce.current = true;
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCollection();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") loadCollection();
    });

    return () => subscription.unsubscribe();
  }, [loadCollection, supabase]);

  /* remember the yearly goal */
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("reading-goal"));
      if (saved > 0) setGoal(Math.min(200, saved));
    } catch {
      /* ignore */
    }
  }, []);

  /* clear any pending "pick my next read" timers on unmount */
  useEffect(() => {
    const timers = pickTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ---------- derived ---------- */

  const shelfCounts = useMemo(
    () => ({
      "Want to read": collection.filter((b) => b.shelf === "Want to read").length,
      "Currently reading": collection.filter((b) => b.shelf === "Currently reading").length,
      Read: collection.filter((b) => b.shelf === "Read").length,
      Favourites: collection.filter((b) => b.isFavorite).length,
    }),
    [collection]
  );

  const year = new Date().getFullYear();

  const readThisYear = useMemo(
    () =>
      collection.filter(
        (b) => b.shelf === "Read" && b.finishedOn?.startsWith(String(year))
      ),
    [collection, year]
  );

  const pagesThisYear = readThisYear.reduce(
    (sum, book) => sum + (book.pageCount ?? 0),
    0
  );

  const matchesShelf = (book: SavedBook) =>
    activeShelf === "Favourites"
      ? book.isFavorite
      : book.shelf === activeShelf;

  const visibleBooks = useMemo(() => {
    const query = shelfQuery.trim().toLowerCase();

    const list = collection.filter((book) => {
      const onShelf =
        activeShelf === "Favourites"
          ? book.isFavorite
          : book.shelf === activeShelf;
      const queryOk =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.authors.some((author) => author.toLowerCase().includes(query));
      return (onShelf || linger.has(book.id)) && queryOk;
    });

    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "author") {
      list.sort((a, b) => (a.authors[0] ?? "").localeCompare(b.authors[0] ?? ""));
    }
    if (sort === "rating") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    if (sort === "year") {
      list.sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0));
    }

    return list;
  }, [collection, activeShelf, shelfQuery, sort, linger]);

  const alreadyAddedIds = useMemo(
    () => new Set(collection.map((book) => book.id)),
    [collection]
  );

  const activeIndex = shelves.indexOf(activeShelf);

  const fanBooks: (SavedBook | null)[] = [0, 1, 2].map(
    (index) => collection[index] ?? null
  );

  /* hero covers take turns on top */
  useEffect(() => {
    if (reduced || collection.length < 2) return;
    const timer = setInterval(() => setShuffle((value) => value + 1), 4200);
    return () => clearInterval(timer);
  }, [reduced, collection.length]);

  const marqueeTitles =
    collection.length > 0
      ? collection.map((book) => book.title)
      : [
          "Stories",
          "Little escapes",
          "Favourite words",
          "One more chapter",
          "Tea & pages",
          "Rainy day reads",
        ];

  const marqueeReel = Array.from(
    { length: Math.max(1, Math.ceil(8 / marqueeTitles.length)) },
    () => marqueeTitles
  ).flat();

  const heroLetters = "The Library".split("");

  /* ---------- effects: modal + menu ---------- */

  useEffect(() => {
    if (!selectedBookId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedBookId(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedBookId]);

  useEffect(() => {
    if (!openMenuBookId) return;

    const close = () => {
      setOpenMenuBookId(null);
      setConfirmRemoveId(null);
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
  }, [openMenuBookId]);

  /* ---------- actions ---------- */

  async function getUserId() {
    if (userId) return userId;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? "";
  }

  function clearSearch() {
    setSearchResults([]);
    setSearchQuery("");
    setHasSearched(false);
  }

  async function searchBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      searchInputRef.current?.focus();
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setHasSearched(false);

    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");

      const result = await response.json();
      setSearchResults(result.books || []);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      notify("Couldn't search for books. Please try again.", "error");
    } finally {
      setSearching(false);
    }
  }

  async function addBook(book: Book) {
    const uid = await getUserId();

    if (!uid) {
      window.location.href = "/login";
      return;
    }

    if (collection.some((item) => item.id === book.id)) {
      notify("This book is already on your shelf ♡");
      return;
    }

    setAddingBook(book.id);

    const today = getLocalDate();

    const { error: insertError } = await supabase.from("book_entries").insert({
      user_id: uid,
      openlibrary_id: book.id,
      title: book.title,
      authors: book.authors || [],
      published_year: book.publishedYear ?? null,
      cover_id: book.coverId ?? null,
      cover_url: book.coverUrl ?? null,
      isbn: book.isbn || null,
      publisher: book.publisher || null,
      page_count: book.pageCount ?? null,
      shelf: "Want to read",
      started_on: today,
      is_favorite: false,
    });

    if (insertError) {
      console.error(insertError);
      notify(
        insertError.code === "23505"
          ? "This book is already on your shelf ♡"
          : "Couldn't add this book. Please try again.",
        insertError.code === "23505" ? "ok" : "error"
      );
      setAddingBook(null);
      return;
    }

    setCollection((previous) => [
      {
        ...book,
        authors: book.authors || [],
        shelf: "Want to read",
        rating: null,
        review: null,
        isFavorite: false,
        startedOn: today,
        finishedOn: null,
      },
      ...previous,
    ]);

    notify(`“${book.title}” has found a place on your shelf ♡`);
    setAddingBook(null);
  }

  async function changeShelf(book: SavedBook, shelf: Shelf) {
    if (book.shelf === shelf || updatingBook) return;

    const uid = await getUserId();
    if (!uid) {
      notify("Please log in to move books.", "error");
      return;
    }

    setUpdatingBook(book.id);
    setOpenMenuBookId(null);
    setConfirmRemoveId(null);

    // Moving a book out of "Read" clears its finish date.
    const finishedOn = shelf === "Read" ? getLocalDate() : null;

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ shelf, finished_on: finishedOn })
      .eq("openlibrary_id", book.id)
      .eq("user_id", uid);

    if (updateError) {
      console.error(updateError);
      notify("Couldn't update this book. Please try again.", "error");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id ? { ...item, shelf, finishedOn } : item
      )
    );

    if (shelf === "Read") {
      window.dispatchEvent(new Event("book-finished"));
      releasePetals();
      flashCard(book.id, "finished");

      notify(
        readThisYear.length + 1 === goal
          ? `Reading goal reached! ${goal} books in ${year} 🌹`
          : `“${book.title}” — finished! ♡`
      );
    } else if (shelf === "Currently reading") {
      flashCard(book.id, "started");
      notify(`Happy reading! “${book.title}” is open ♡`);
    } else {
      notify(`Moved “${book.title}” to ${shelf}.`);
    }

    setUpdatingBook(null);
  }

  async function toggleFavorite(book: SavedBook) {
    const uid = await getUserId();
    if (!uid) return;

    const next = !book.isFavorite;

    setFavoritePop(book.id);
    setTimeout(() => setFavoritePop(null), 450);

    if (next) {
      setBurstId(book.id);
      setTimeout(() => setBurstId(null), 900);
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id ? { ...item, isFavorite: next } : item
      )
    );

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ is_favorite: next })
      .eq("openlibrary_id", book.id)
      .eq("user_id", uid);

    if (updateError) {
      console.error(updateError);
      setCollection((previous) =>
        previous.map((item) =>
          item.id === book.id ? { ...item, isFavorite: !next } : item
        )
      );
      notify("Couldn't update your favourites.", "error");
    }
  }

  async function removeBook(book: SavedBook) {
    const uid = await getUserId();
    if (!uid) {
      notify("Please log in to remove books.", "error");
      return;
    }

    setOpenMenuBookId(null);
    setConfirmRemoveId(null);
    setRemovingId(book.id);

    if (!reduced) await new Promise((resolve) => setTimeout(resolve, 380));

    const { error: deleteError } = await supabase
      .from("book_entries")
      .delete()
      .eq("openlibrary_id", book.id)
      .eq("user_id", uid);

    if (deleteError) {
      console.error(deleteError);
      notify("Couldn't remove this book. Please try again.", "error");
      setRemovingId(null);
      return;
    }

    setCollection((previous) => previous.filter((item) => item.id !== book.id));
    if (selectedBookId === book.id) setSelectedBookId(null);
    setRemovingId(null);
    notify(`“${book.title}” was removed from your library.`);
  }

  async function saveRating(book: SavedBook, rating: number) {
    const uid = await getUserId();
    if (!uid) return;

    const previousRating = book.rating;

    setRatingPop(book.id);
    setTimeout(() => setRatingPop(null), 450);

    setCollection((previous) =>
      previous.map((item) => (item.id === book.id ? { ...item, rating } : item))
    );

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ rating })
      .eq("openlibrary_id", book.id)
      .eq("user_id", uid);

    if (updateError) {
      console.error(updateError);
      setCollection((previous) =>
        previous.map((item) =>
          item.id === book.id ? { ...item, rating: previousRating } : item
        )
      );
      notify("Couldn't save your rating.", "error");
      return;
    }

    notify(`${rating}/5 — ${ratingLabels[rating - 1]} ✨`);
  }

  async function saveReview(book: SavedBook) {
    const draft = reviewDrafts[book.id] ?? book.review ?? "";

    if (draft === (book.review ?? "")) {
      notify("Your note is already saved ♡");
      return;
    }

    const uid = await getUserId();
    if (!uid) return;

    setUpdatingBook(book.id);

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ review: draft || null })
      .eq("openlibrary_id", book.id)
      .eq("user_id", uid);

    if (updateError) {
      console.error(updateError);
      notify("Couldn't save your note.", "error");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id ? { ...item, review: draft || null } : item
      )
    );
    setReviewDrafts((previous) => {
      const next = { ...previous };
      delete next[book.id];
      return next;
    });
    setSavedNotes((previous) => [...previous, book.id]);
    setTimeout(
      () => setSavedNotes((previous) => previous.filter((id) => id !== book.id)),
      2500
    );
    notify("Your little note has been saved ♡");
    setUpdatingBook(null);
  }

  /** Spins a highlight across your "Want to read" covers, then opens the winner. */
  function pickNextRead() {
    const pool = collection.filter((book) => book.shelf === "Want to read");
    if (pool.length === 0) return;

    pickTimers.current.forEach(clearTimeout);
    pickTimers.current = [];

    setActiveShelf("Want to read");
    setShelfQuery("");

    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIndex];

    if (reduced || pool.length === 1) {
      setSelectedBookId(winner.id);
      return;
    }

    // Lap the shelf twice, then land exactly on the winner, slowing as we go.
    const steps = pool.length * 2 + winnerIndex + 1;
    let elapsed = 0;

    for (let step = 0; step < steps; step++) {
      elapsed += 70 + step * 12;
      const book = pool[step % pool.length];
      pickTimers.current.push(setTimeout(() => setHighlightId(book.id), elapsed));
    }

    pickTimers.current.push(
      setTimeout(() => {
        setSelectedBookId(winner.id);
        notify(`Tonight's read: “${winner.title}” ♡`);
      }, elapsed + 650)
    );
    pickTimers.current.push(
      setTimeout(() => setHighlightId(null), elapsed + 700)
    );
  }

  /* ---------- render ---------- */

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#faf7f2] text-[#51463e]">
      <MagicalMushrooms />
      <SleepyCat />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&display=swap");

        .font-display {
          font-family: "Fraunces", Georgia, serif;
          font-variation-settings: "SOFT" 100;
        }

        /* ---------- living background ---------- */
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
        .aurora span:nth-child(3) { width: 340px; height: 340px; top: 520px; left: 30%; background: #cfe0bd; animation-delay: -11s; }
        .aurora span:nth-child(4) { width: 300px; height: 300px; top: 900px; right: 8%; background: #f5dba3; animation-delay: -3s; }
        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.18); }
        }

        /* ---------- hero title: letters rise like books on a shelf ---------- */
        .hero-letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(70px) rotate(8deg);
          transform-origin: bottom left;
          animation: letter-rise 0.9s cubic-bezier(0.2, 0.9, 0.25, 1.15) forwards;
          transition: transform 0.35s cubic-bezier(0.3, 1.6, 0.5, 1), color 0.3s;
          cursor: default;
        }
        .hero-letter:hover {
          transform: translateY(-14px) rotate(-6deg) scale(1.12);
          color: #b66c7c;
        }
        @keyframes letter-rise {
          to { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
        .hero-dot {
          display: inline-block;
          color: #c58f85;
          animation: dot-bounce 2.6s ease-in-out 1.6s infinite;
        }
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-16px); }
          60% { transform: translateY(0); }
          75% { transform: translateY(-5px); }
        }
        .hero-sub {
          opacity: 0;
          animation: fade-in 0.9s ease 1.3s forwards;
        }
        @keyframes fade-in { to { opacity: 1; } }

        /* ---------- cover fan that shuffles ---------- */
        .fan-slot {
          position: absolute;
          left: 0;
          top: 0;
          width: 132px;
          transition: transform 0.9s cubic-bezier(0.3, 1.25, 0.4, 1);
        }
        .fan-card {
          aspect-ratio: 0.68 / 1;
          border-radius: 14px;
          overflow: hidden;
          border: 3px solid #fffdfa;
          box-shadow: 0 18px 34px rgba(91, 58, 48, 0.25);
          animation: fan-float 5s ease-in-out infinite;
        }
        @keyframes fan-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }

        /* ---------- marquee ---------- */
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee linear infinite;
        }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        @keyframes marquee { to { transform: translateX(-50%); } }

        /* ---------- stats + goal ring ---------- */
        .stat-card {
          opacity: 0;
          animation: stat-pop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
        }
        @keyframes stat-pop {
          from { opacity: 0; transform: translateY(24px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .goal-ring { transition: stroke-dashoffset 1.1s cubic-bezier(0.2, 0.9, 0.3, 1); }

        /* ---------- search: rotating glow border ---------- */
        @property --angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        .glow-border {
          position: relative;
          border-radius: 2rem;
          padding: 2px;
          background: conic-gradient(from var(--angle), #f2c3b8, #d9c5ee, #cfe0bd, #f5dba3, #f2c3b8);
          animation: spin-angle 7s linear infinite;
        }
        @keyframes spin-angle { to { --angle: 360deg; } }
        .shake { animation: shake 0.4s ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        /* ---------- tabs ---------- */
        .tab-indicator { transition: transform 0.45s cubic-bezier(0.3, 1.25, 0.4, 1); }

        /* ---------- every cover stands on its own plank (planks join up per row) ---------- */
        .stand {
          position: relative;
          isolation: isolate;
          padding-bottom: 16px;
        }
        .stand::after {
          content: "";
          position: absolute;
          z-index: -1;
          left: -0.75rem;
          right: -0.75rem;
          bottom: 0;
          height: 13px;
          border-radius: 4px;
          background: linear-gradient(180deg, #c89a72 0%, #a97855 55%, #80563f 100%);
          box-shadow: 0 7px 12px #68442c25, 0 2px 0 #e2c09b inset;
        }

        .book-enter {
          opacity: 0;
          animation: book-enter 0.75s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
        }
        @keyframes book-enter {
          from { opacity: 0; transform: translateY(60px) rotate(-6deg) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
        }

        .book-breath {
          transform-origin: bottom center;
          animation: book-breathe 4.5s ease-in-out infinite;
        }
        .book-breath-wrap:nth-child(2n) .book-breath { animation-delay: -1.4s; }
        .book-breath-wrap:nth-child(3n) .book-breath { animation-delay: -2.7s; }
        .group:hover .book-breath { animation-play-state: paused; }
        @keyframes book-breathe {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(0.6deg); }
        }

        .tilt {
          --rx: 0deg; --ry: 0deg; --mx: 50%; --my: 50%;
          position: relative;
          transform: perspective(700px) rotateX(var(--rx)) rotateY(var(--ry));
          transform-style: preserve-3d;
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
          background: radial-gradient(circle at var(--mx) var(--my), rgba(255, 255, 255, 0.55), transparent 55%);
        }
        .group:hover .tilt::after { opacity: 1; }

        .spine-edge {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 9px;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(40, 20, 20, 0.28), transparent);
          z-index: 2;
        }

        /* "pick my next read" spotlight */
        .pick-glow {
          outline: 4px solid #b66c7c;
          outline-offset: 3px;
          box-shadow: 0 18px 34px rgba(182, 108, 124, 0.45);
        }

        /* bookmark ribbon on finished books */
        .ribbon {
          position: absolute;
          top: 0;
          left: 50%;
          margin-left: -9px;
          width: 18px;
          height: 34px;
          z-index: 6;
          background: #65705c;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
          animation: ribbon-drop 0.7s cubic-bezier(0.2, 1.3, 0.4, 1) both;
        }
        @keyframes ribbon-drop {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* hover actions, like pins on the cover */
        .pin-actions {
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .group:hover .pin-actions,
        .group:focus-within .pin-actions,
        .pin-actions.keep { opacity: 1; transform: translateY(0); }
        @media (hover: none) {
          .pin-actions { opacity: 1; transform: none; }
        }

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
          animation: burst-fly 0.8s ease-out forwards;
        }
        @keyframes burst-fly {
          0% { opacity: 0; transform: translate(0, 0) scale(0.3); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.15) rotate(18deg); }
        }
        .heart-pop { animation: heart-pop 0.45s ease-out; }
        @keyframes heart-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.65) rotate(-12deg); }
          70% { transform: scale(0.85) rotate(8deg); }
          100% { transform: scale(1); }
        }

        /* ---------- stamp + open-book moments ---------- */
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
          background: rgba(101, 112, 92, 0.9);
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
        .page-flip {
          transform-origin: 32px 26px;
          animation: page-flip 1s ease-in-out 0.3s both;
        }
        @keyframes page-flip {
          0% { transform: scaleX(1); }
          60%, 100% { transform: scaleX(-1); }
        }

        /* ---------- cards leaving + small cues ---------- */
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
        .skeleton {
          border-radius: 1.05rem;
          background: linear-gradient(100deg, #f1e4dc 30%, #fbf3ee 50%, #f1e4dc 70%);
          background-size: 250% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
          from { background-position: 100% 0; }
          to { background-position: -100% 0; }
        }

        /* ---------- toast + modal ---------- */
        .success-toast {
          position: fixed;
          z-index: 140;
          bottom: calc(20px + env(safe-area-inset-bottom));
          left: 50%;
          max-width: 90vw;
          text-align: center;
          transform: translateX(-50%);
          animation: toast-appear 3.2s ease-in-out forwards;
          pointer-events: none;
        }
        @keyframes toast-appear {
          0% { opacity: 0; transform: translate(-50%, 18px) scale(0.9); }
          12%, 80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
        }
        .modal-pop { animation: modal-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        @keyframes modal-pop {
          from { opacity: 0; transform: translateY(30px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .star-btn { transition: transform 0.25s cubic-bezier(0.3, 1.8, 0.5, 1); }
        .star-btn:hover { transform: scale(1.3) rotate(-12deg); }
        .star-pop { animation: star-pop 0.35s ease-out; }
        @keyframes star-pop {
          0% { transform: scale(0.6) rotate(-25deg); }
          60% { transform: scale(1.5) rotate(12deg); }
          100% { transform: scale(1) rotate(0); }
        }

        /* ---------- petals ---------- */
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
          .aurora span, .hero-dot, .fan-card, .marquee-track, .glow-border,
          .book-breath, .live-dot, .skeleton, .burst-heart, .stamp, .action-pop,
          .page-flip, .flash-layer, .wiggle, .shake, .heart-pop, .star-pop,
          .modal-pop, .success-toast { animation: none; }
          .petal, .burst { display: none; }
          .poof { animation: none; opacity: 0; }
          .hero-letter, .hero-sub, .stat-card, .book-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .tilt { transform: none; }
          .fan-slot, .tab-indicator, .goal-ring { transition: none; }
          .flash-layer { opacity: 1; }
        }
      `}</style>

      {/* living background */}
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:px-12">
        {/* Site header */}
        <header className="mb-10">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <Brand />

            <nav
              aria-label="Main navigation"
              className="flex items-center gap-1 rounded-full border border-[#eadbd2] bg-white/70 p-1 shadow-sm backdrop-blur-sm"
            >
              <Link
                href="/cinema"
                className="rounded-full px-4 py-2 text-xs font-medium text-[#713746] transition hover:bg-[#f4e7e7] sm:text-sm"
              >
                Films
              </Link>
              <Link
                href="/library"
                aria-current="page"
                className="rounded-full bg-[#65705c] px-4 py-2 text-xs font-medium text-white shadow-sm sm:text-sm"
              >
                Books
              </Link>
            </nav>
          </div>

          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <h1
                aria-label="The Library."
                className="font-display text-6xl leading-[0.95] tracking-tight text-[#51463e] sm:text-8xl"
              >
                <span aria-hidden="true">
                  {heroLetters.map((letter, index) => (
                    <span
                      key={index}
                      className="hero-letter"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      {letter === " " ? "\u00A0" : letter}
                    </span>
                  ))}
                  <span className="hero-dot">.</span>
                </span>
              </h1>

              <p className="hero-sub mt-5 max-w-md font-display text-lg italic text-[#8f6f62]">
                A little home for every book you love. So many stories, so
                little time ♡
              </p>
            </div>

            {/* floating cover fan: covers take turns on top */}
            <div
              className="relative hidden h-64 w-64 shrink-0 sm:block"
              aria-hidden="true"
            >
              {fanBooks.map((book, index) => {
                const slot = fanSlots[(index + shuffle) % 3];

                return (
                  <div
                    key={book?.id ?? `placeholder-${index}`}
                    className="fan-slot"
                    style={{
                      transform: `translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg)`,
                      zIndex: slot.z,
                    }}
                  >
                    <div
                      className="fan-card bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9]"
                      style={{ animationDelay: `${-index * 1.7}s` }}
                    >
                      <Cover url={book?.coverUrl} title={book?.title ?? ""} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* Marquee of titles (kept inside the content width so it lines up with the cards) */}
        <div
          className="marquee-wrap mb-10 overflow-hidden rounded-2xl border border-[#eadfd5] bg-white/50 py-3 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div
            className="marquee-track"
            style={{ animationDuration: `${Math.max(30, marqueeReel.length * 4)}s` }}
          >
            {[...marqueeReel, ...marqueeReel].map((title, index) => (
              <span
                key={index}
                className="flex shrink-0 items-center gap-6 pr-6 font-display text-lg italic text-[#8f6f62]"
              >
                {title}
                <Heart size={12} className="text-[#c98e84]" fill="currentColor" />
              </span>
            ))}
          </div>
        </div>

        {/* Stats + yearly goal */}
        {!signedOut && (
          <section className="mb-12">
            <GoalCard
              done={readThisYear.length}
              goal={goal}
              pages={pagesThisYear}
              reduced={reduced}
              onChange={changeGoal}
            />
          </section>
        )}

        {/* Search */}
        <section className="glow-border mb-12">
          <div className="rounded-[calc(2rem-2px)] bg-[#fffdfa]/95 p-5 backdrop-blur-md sm:p-7">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles size={19} className="animate-pulse text-[#bd9385]" />
              <h2 className="font-display text-2xl">Find a new story</h2>
            </div>

            <form
              onSubmit={searchBooks}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div
                className={`flex flex-1 items-center gap-3 rounded-full border border-[#eadfd5] bg-white px-5 py-3 transition focus-within:border-[#c8a99a] focus-within:shadow-[0_0_0_4px_rgba(200,169,154,0.2)] ${
                  shake ? "shake" : ""
                }`}
              >
                <Search size={17} className="shrink-0 text-[#ae9688]" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={placeholder || "Search for a book…"}
                  aria-label="Search by book or author"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#a69a90]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="shrink-0 rounded-full p-1 text-[#b49a9c] transition hover:bg-[#f4eee8] hover:text-[#713746]"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="rounded-full bg-[#713746] px-8 py-3 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d] hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searching && (
              <div
                className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                aria-hidden="true"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="skeleton h-36" />
                ))}
              </div>
            )}

            {!searching && hasSearched && searchResults.length === 0 && (
              <p role="status" className="mt-6 text-sm text-[#8c7a6f]">
                No books found. Try the author&apos;s name or a shorter title.
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-xl">Found for you</h3>
                  <button
                    onClick={clearSearch}
                    className="rounded-full border border-[#e6d6d0] bg-white/70 px-4 py-1.5 text-xs text-[#876d70] transition hover:border-[#b66c7c] hover:text-[#713746]"
                  >
                    Clear results
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((book, index) => {
                    const isAdded = alreadyAddedIds.has(book.id);

                    return (
                      <div
                        key={book.id}
                        className="book-enter flex gap-4 rounded-2xl border border-[#eee4da] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
                        style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
                      >
                        <div className="h-28 w-[74px] shrink-0 overflow-hidden rounded-lg bg-[#f1eae2]">
                          <Cover
                            url={book.coverUrl}
                            title={book.title}
                            author={book.authors?.[0]}
                          />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <h4 className="line-clamp-2 font-display text-base">
                            {book.title}
                          </h4>
                          <p
                            title={book.authors?.join(", ")}
                            className="mt-1 line-clamp-2 text-xs text-[#8c7a6f]"
                          >
                            {book.authors?.join(", ") || "Unknown author"}
                          </p>

                          <button
                            onClick={() => addBook(book)}
                            disabled={isAdded || addingBook === book.id}
                            className={`mt-auto pt-3 text-left text-xs transition hover:translate-x-1 disabled:hover:translate-x-0 ${
                              isAdded ? "text-[#52634a]" : "text-[#98776b]"
                            } disabled:opacity-80`}
                          >
                            {addingBook === book.id
                              ? "Adding..."
                              : isAdded
                                ? "✓ Already on your shelf"
                                : "+ Add to Want to read"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bookshelf */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-4xl">My books</h2>
            <p className="text-sm text-[#8c7a6f]">
              A shelf for every reading mood.
            </p>
          </div>

          {/* Tabs with sliding pill */}
          <div
            role="tablist"
            className="relative mb-6 grid grid-cols-4 rounded-full border border-[#e9dfd6] bg-white/60 p-1 backdrop-blur-sm"
          >
            <div
              aria-hidden="true"
              className="tab-indicator absolute bottom-1 left-1 top-1 rounded-full bg-gradient-to-r from-[#94766b] to-[#b66c7c] shadow-md"
              style={{
                width: "calc((100% - 0.5rem) / 4)",
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />

            {shelves.map((shelf) => {
              const active = activeShelf === shelf;

              return (
                <button
                  key={shelf}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveShelf(shelf)}
                  className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2.5 text-center text-[11px] leading-tight transition-colors duration-300 sm:flex-row sm:gap-2 sm:text-sm ${
                    active ? "text-white" : "text-[#6f6258] hover:text-[#51463e]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {shelf === "Favourites" && <Heart size={13} />}
                    {shelf}
                  </span>
                  <span className={`tabular-nums ${active ? "text-white/80" : "text-[#8c7a6f]"}`}>
                    {shelfCounts[shelf]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter, sort and "pick my next read" */}
          {!loading && !signedOut && !loadError && collection.length > 0 && (
            <div className="mb-10 flex flex-wrap items-center gap-2">
              <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#e6d6d0] bg-white/70 px-4 text-sm transition focus-within:border-[#b66c7c] sm:max-w-xs">
                <Search size={15} className="shrink-0 text-[#ae9688]" />
                <input
                  value={shelfQuery}
                  onChange={(event) => setShelfQuery(event.target.value)}
                  placeholder="Filter this shelf…"
                  aria-label="Filter this shelf by title or author"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#a69a90]"
                />
                {shelfQuery && (
                  <button
                    type="button"
                    onClick={() => setShelfQuery("")}
                    aria-label="Clear filter"
                    className="shrink-0 rounded-full p-1 text-[#b49a9c] transition hover:text-[#713746]"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <label className="flex shrink-0 items-center gap-2 text-xs text-[#8c7a6f]">
                <span className="sr-only sm:not-sr-only">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                  className="min-h-10 rounded-full border border-[#e6d6d0] bg-white/70 px-3 py-1.5 text-xs text-[#6f6258] outline-none focus:border-[#b66c7c]"
                >
                  {(Object.keys(sortLabels) as Sort[]).map((value) => (
                    <option key={value} value={value}>
                      {sortLabels[value]}
                    </option>
                  ))}
                </select>
              </label>

              {shelfCounts["Want to read"] >= 2 && (
                <button
                  type="button"
                  onClick={pickNextRead}
                  className="ml-auto flex min-h-10 items-center gap-2 rounded-full border border-[#b66c7c] bg-[#f8e8ec] px-4 py-2 text-xs font-medium text-[#713746] transition hover:-translate-y-0.5 hover:bg-[#f4dbe2] active:scale-95"
                >
                  <Shuffle size={14} />
                  Pick my next read
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              aria-label="Loading your library"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="stand">
                  <div className="skeleton aspect-[0.68/1] w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Signed out */}
          {!loading && signedOut && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#dfd2c7] bg-white/60 px-6 text-center backdrop-blur-sm">
              <BookOpen size={28} className="mb-4 text-[#a9786d]" />
              <h3 className="font-display text-2xl">Your shelf is waiting</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#8c7a6f]">
                Sign in to see the books you&apos;ve saved and add new ones.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#713746] px-6 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#8b4a5d]"
              >
                Sign in ♡
              </Link>
            </div>
          )}

          {/* Load error */}
          {!loading && !signedOut && loadError && (
            <div
              role="alert"
              className="flex min-h-48 flex-col items-center justify-center rounded-[2rem] border border-[#e8c4bd] bg-[#fff0ed] px-6 text-center"
            >
              <p className="text-sm text-[#a45e53]">{loadError}</p>
              <button
                onClick={() => loadCollection()}
                className="mt-4 min-h-11 rounded-full border border-[#d9b9b6] bg-white px-6 py-2 text-sm transition hover:bg-[#f0dfd7] active:scale-95"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty shelf, or no filter matches */}
          {!loading &&
            !signedOut &&
            !loadError &&
            visibleBooks.length === 0 && (
              <div
                key={`${activeShelf}-${shelfQuery}`}
                className="book-enter flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#dfd2c7] bg-white/60 px-6 text-center backdrop-blur-sm"
              >
                <div className="mb-4 animate-bounce rounded-full bg-[#f4e8e2] p-4 text-[#a9786d]">
                  {activeShelf === "Favourites" ? (
                    <Heart size={25} />
                  ) : (
                    <BookOpen size={25} />
                  )}
                </div>

                {shelfQuery.trim() ? (
                  <>
                    <h3 className="font-display text-2xl">Nothing matches that</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#8c7a6f]">
                      No books on this shelf match “{shelfQuery.trim()}”.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShelfQuery("")}
                      className="mt-5 min-h-11 rounded-full border border-[#d9b9b6] bg-white px-6 py-2 text-sm transition hover:bg-[#f0dfd7] active:scale-95"
                    >
                      Clear filter
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-display text-2xl">
                      {emptyCopy[activeShelf].title}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#8c7a6f]">
                      {emptyCopy[activeShelf].text}
                    </p>
                  </>
                )}
              </div>
            )}

          {/* Books on wooden planks (re-keyed so every shelf or sort change replays the entrance) */}
          {!loading && !signedOut && !loadError && visibleBooks.length > 0 && (
            <div
              key={`${activeShelf}-${sort}`}
              className="grid grid-cols-2 items-start gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            >
              {visibleBooks.map((book, index) => {
                const menuOpen = openMenuBookId === book.id;
                const confirming = confirmRemoveId === book.id;
                const leaving =
                  removingId === book.id ||
                  (leavingId === book.id && !matchesShelf(book));
                const flashing = flash?.id === book.id ? flash : null;

                return (
                  <article
                    key={book.id}
                    className={`book-enter book-breath-wrap group relative flex min-w-0 flex-col ${
                      leaving ? "poof" : ""
                    }`}
                    style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}
                  >
                    <div className="stand">
                      <button
                        onClick={() => setSelectedBookId(book.id)}
                        className="relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-4"
                        aria-label={`Open ${book.title}`}
                      >
                        <div className="book-breath">
                          <div
                            className={`tilt aspect-[0.68/1] w-full overflow-hidden rounded-[1.05rem] bg-[linear-gradient(135deg,#e7b6a8,#d6b7d9,#b8c9a9,#efcf91)] p-[3px] shadow-[0_5px_16px_rgba(91,58,48,0.14)] group-hover:shadow-[0_18px_30px_rgba(91,58,48,0.28)] ${
                              highlightId === book.id ? "pick-glow" : ""
                            }`}
                            onMouseMove={handleTilt}
                            onMouseLeave={resetTilt}
                          >
                            <span className="spine-edge" />

                            <div className="h-full w-full overflow-hidden rounded-[0.9rem] bg-[#eee5dc] ring-1 ring-inset ring-white/70">
                              <Cover
                                url={book.coverUrl}
                                title={book.title}
                                author={book.authors?.[0]}
                                detailed
                              />
                            </div>

                            {book.shelf === "Read" && (
                              <span
                                className="ribbon"
                                aria-hidden="true"
                                style={{ animationDelay: `${Math.min(index, 12) * 70 + 450}ms` }}
                              />
                            )}

                            {book.shelf === "Currently reading" && (
                              <span className="absolute bottom-3 left-3 z-10 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#87505e] shadow-sm">
                                <span className="live-dot" />
                                Reading
                              </span>
                            )}

                            {flashing && (
                              <div className="flash-layer" aria-hidden="true">
                                {flashing.kind === "finished" ? (
                                  <span className="stamp">THE END ♡</span>
                                ) : (
                                  <div className="action-pop">
                                    <OpenBook />
                                    <span className="font-display text-base italic">
                                      Happy reading!
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* card menu */}
                      <div
                        data-card-menu
                        className="pin-actions absolute left-1 top-1 z-30"
                        style={menuOpen ? { opacity: 1, transform: "none" } : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmRemoveId(null);
                            setOpenMenuBookId(menuOpen ? null : book.id);
                          }}
                          aria-label={`More options for ${book.title}`}
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#876d70] shadow-md transition hover:scale-110 hover:text-[#713746] focus:outline-none focus:ring-2 focus:ring-[#b66c7c]"
                        >
                          <MoreHorizontal size={17} />
                        </button>

                        {menuOpen && (
                          <div
                            role="menu"
                            className="modal-pop absolute left-0 top-10 w-40 overflow-hidden rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-1.5 shadow-xl"
                          >
                            <p className="px-3 pb-1 pt-1.5 text-[10px] text-[#8c7a6f]">
                              Move to…
                            </p>

                            {moveShelves
                              .filter((shelf) => shelf !== book.shelf)
                              .map((shelf) => (
                                <button
                                  key={shelf}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => changeShelf(book, shelf)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-[#713746] transition hover:bg-[#f8ecec]"
                                >
                                  {shelf === "Read" ? (
                                    <Check size={14} />
                                  ) : (
                                    <BookOpen size={14} />
                                  )}
                                  {shelf}
                                </button>
                              ))}

                            <div className="my-1 border-t border-[#f0e6dd]" />

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() =>
                                confirming
                                  ? void removeBook(book)
                                  : setConfirmRemoveId(book.id)
                              }
                              disabled={updatingBook === book.id}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition disabled:opacity-50 ${
                                confirming
                                  ? "wiggle bg-[#f8dfe3] text-[#9b3d54]"
                                  : "text-[#9b5363] hover:bg-[#f8ecec]"
                              }`}
                            >
                              <Trash2 size={14} />
                              {confirming ? "Tap again to remove" : "Remove"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* favourite heart */}
                      <div
                        className={`pin-actions absolute right-1 top-1 z-10 ${
                          book.isFavorite ? "keep" : ""
                        }`}
                      >
                        <button
                          onClick={() => toggleFavorite(book)}
                          aria-label={
                            book.isFavorite
                              ? "Remove from favourites"
                              : "Add to favourites"
                          }
                          aria-pressed={book.isFavorite}
                          className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-white/70 shadow-md transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#b66c7c] focus:ring-offset-2 ${
                            book.isFavorite
                              ? "bg-[#fbe8ed] text-[#c04d70]"
                              : "bg-white/95 text-[#bd887f] hover:bg-white"
                          } ${favoritePop === book.id ? "heart-pop" : ""}`}
                        >
                          <Heart
                            size={16}
                            fill={book.isFavorite ? "currentColor" : "none"}
                          />
                          {burstId === book.id && <HeartBurst />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedBookId(book.id)}
                      className="mt-3 block w-full px-1 text-center"
                    >
                      <h3 className="line-clamp-2 min-h-12 font-display text-base leading-6 text-[#51463e] sm:text-lg">
                        {book.title}
                      </h3>
                      <p
                        title={book.authors?.join(", ")}
                        className="mt-1 line-clamp-1 text-xs text-[#8c7a6f] sm:text-sm"
                      >
                        {book.authors?.join(", ") || "Unknown author"}
                      </p>
                      {book.shelf === "Read" && book.rating && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#9a6f3e]">
                          <Star size={11} fill="currentColor" />
                          {book.rating}/5
                        </p>
                      )}
                    </button>

                    {(book.shelf === "Want to read" ||
                      book.shelf === "Currently reading") && (
                      <div className="mt-3 flex w-full flex-col gap-2">
                        {book.shelf === "Want to read" && (
                          <button
                            onClick={() => changeShelf(book, "Currently reading")}
                            disabled={Boolean(updatingBook)}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#b66c7c] bg-[#b66c7c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a65d6e] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
                          >
                            {updatingBook === book.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <BookOpen size={14} />
                            )}
                            {updatingBook === book.id ? "Moving..." : "Start reading"}
                          </button>
                        )}

                        <button
                          onClick={() => changeShelf(book, "Read")}
                          disabled={Boolean(updatingBook)}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#65705c] bg-[#65705c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#56604d] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65705c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
                        >
                          {updatingBook === book.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          {updatingBook === book.id ? "Moving..." : "I've finished it"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[#e9dfd6] pt-8 text-center">
          <p className="font-display text-xl italic text-[#8e7569]">
            One more chapter, always ♡
          </p>
          <p className="mt-2 text-xs tracking-wide text-[#8c7a6f]">
            part of reel & rose
          </p>
          <Link
            href="/cinema"
            className="mt-5 inline-flex items-center gap-2 text-sm text-[#94766b] transition hover:gap-3 hover:text-[#65564c]"
          >
            <Sparkles size={15} />
            Visit The Cinema
          </Link>
        </footer>
      </div>

      {/* Falling petals when you finish a book */}
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="petal"
          aria-hidden="true"
          style={{
            left: `${petal.left}%`,
            fontSize: petal.size,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            color: "#c9707f",
          }}
        >
          {petal.symbol}
        </span>
      ))}

      {toast && (
        <div
          key={toast.text}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`success-toast rounded-full border px-6 py-3 text-sm shadow-xl ${
            toast.tone === "error"
              ? "border-[#e8c4bd] bg-[#fff0ed] text-[#a45e53]"
              : "border-[#d8e3d0] bg-white text-[#52634a]"
          }`}
        >
          {toast.tone === "ok" && "✨ "}
          {toast.text}
        </div>
      )}

      {/* Book details popup */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#352b27]/50 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedBookId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedBook.title} details`}
            className="modal-pop relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#eee4da] bg-[#fffdfa] p-6 shadow-2xl sm:p-8"
          >
            <button
              ref={closeRef}
              onClick={() => setSelectedBookId(null)}
              aria-label="Close book details"
              className="absolute right-5 top-5 z-10 rounded-full bg-[#f4eee8] p-2 text-[#8d776b] transition hover:rotate-90 hover:bg-[#eadfd5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c]"
            >
              <X size={18} />
            </button>

            <div className="flex gap-5 pr-8 sm:gap-7">
              <div
                className="tilt h-44 w-28 shrink-0 overflow-hidden rounded-xl bg-[#eee5dc] shadow-xl sm:h-52 sm:w-36"
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
              >
                <Cover
                  url={selectedBook.coverUrl}
                  title={selectedBook.title}
                  author={selectedBook.authors?.[0]}
                  detailed
                />
              </div>

              <div className="min-w-0 self-center">
                <p className="mb-2 text-xs text-[#8c7a6f]">
                  A story in your collection
                </p>

                <h2 className="font-display text-2xl leading-tight text-[#51463e] sm:text-3xl">
                  {selectedBook.title}
                </h2>

                <p className="mt-2 text-sm text-[#8c7a6f]">
                  {selectedBook.authors?.join(", ") || "Unknown author"}
                </p>

                <p className="mt-1 text-xs text-[#8c7a6f]">
                  {[
                    selectedBook.publishedYear,
                    selectedBook.pageCount ? `${selectedBook.pageCount} pages` : null,
                    selectedBook.publisher,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <span className="mt-4 inline-flex rounded-full bg-[#f4e8e2] px-3 py-1.5 text-xs text-[#7c5f53]">
                  {selectedBook.shelf}
                </span>
              </div>
            </div>

            {selectedBook.shelf !== "Read" && (
              <div className="mt-6 flex flex-wrap gap-2">
                {selectedBook.shelf === "Want to read" && (
                  <button
                    onClick={() => changeShelf(selectedBook, "Currently reading")}
                    disabled={Boolean(updatingBook)}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-[#b66c7c] px-5 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#a65d6e] active:scale-95 disabled:opacity-60"
                  >
                    <BookOpen size={15} /> Start reading
                  </button>
                )}
                <button
                  onClick={() => changeShelf(selectedBook, "Read")}
                  disabled={Boolean(updatingBook)}
                  className="flex min-h-11 items-center gap-2 rounded-full bg-[#65705c] px-5 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#56604d] active:scale-95 disabled:opacity-60"
                >
                  <Check size={15} /> I&apos;ve finished it
                </button>
              </div>
            )}

            <div className="my-7 border-t border-[#eee5dc]" />

            <section>
              <p className="mb-4 text-sm text-[#7c5f53]">Your reading journey</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#8c7a6f]">Added to shelf</p>
                  <p className="mt-2 font-display text-base text-[#65564c]">
                    {formatDate(selectedBook.startedOn)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#8c7a6f]">Finished reading</p>
                  <p className="mt-2 font-display text-base text-[#65564c]">
                    {formatDate(selectedBook.finishedOn)}
                  </p>
                </div>
              </div>
            </section>

            {selectedBook.shelf === "Read" && (
              <>
                <div className="my-7 border-t border-[#eee5dc]" />

                <section>
                  <p className="mb-3 text-sm text-[#7c5f53]">
                    How much did you love it?
                  </p>

                  <div
                    className="flex items-center gap-2"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const lit = star <= (hoverRating || selectedBook.rating || 0);

                      return (
                        <button
                          key={star}
                          onClick={() => saveRating(selectedBook, star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onFocus={() => setHoverRating(star)}
                          onBlur={() => setHoverRating(0)}
                          aria-label={`Rate ${star} out of 5`}
                          className={`star-btn ${
                            ratingPop === selectedBook.id &&
                            star <= (selectedBook.rating ?? 0)
                              ? "star-pop"
                              : ""
                          }`}
                        >
                          <Star
                            size={25}
                            fill={lit ? "#c99b65" : "none"}
                            className={lit ? "text-[#c99b65]" : "text-[#d8c9b9]"}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2 min-h-5 text-xs text-[#7c5f53]">
                    {hoverRating
                      ? ratingLabels[hoverRating - 1]
                      : selectedBook.rating
                        ? `${selectedBook.rating}/5 — ${ratingLabels[selectedBook.rating - 1]}`
                        : "Tap a star to rate it"}
                  </p>
                </section>

                <div className="my-7 border-t border-[#eee5dc]" />

                <section>
                  <label
                    htmlFor={`note-${selectedBook.id}`}
                    className="mb-3 block text-sm text-[#7c5f53]"
                  >
                    Your little book diary
                  </label>

                  <textarea
                    id={`note-${selectedBook.id}`}
                    value={reviewDrafts[selectedBook.id] ?? selectedBook.review ?? ""}
                    onChange={(event) => {
                      setReviewDrafts((previous) => ({
                        ...previous,
                        [selectedBook.id]: event.target.value,
                      }));
                      setSavedNotes((previous) =>
                        previous.filter((id) => id !== selectedBook.id)
                      );
                    }}
                    placeholder="Favourite lines, little thoughts, how it made you feel..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-[#eee1d6] bg-white p-4 text-sm leading-7 text-[#65564c] outline-none transition placeholder:text-[#a69a90] focus:border-[#c8a99a] focus:shadow-[0_0_0_4px_rgba(200,169,154,0.2)]"
                  />

                  {(() => {
                    const draft = reviewDrafts[selectedBook.id] ?? selectedBook.review ?? "";
                    const changed = draft !== (selectedBook.review ?? "");
                    const saving = updatingBook === selectedBook.id;

                    return (
                      <button
                        onClick={() => saveReview(selectedBook)}
                        disabled={saving || !changed}
                        className={`mt-3 flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-xs transition-all duration-200 disabled:cursor-default ${
                          savedNotes.includes(selectedBook.id)
                            ? "bg-[#e5efe2] text-[#52704d]"
                            : changed
                              ? "bg-[#94766b] text-white hover:-translate-y-0.5 hover:bg-[#806257] hover:shadow-md active:scale-95"
                              : "border border-[#e7d4cf] bg-white text-[#8c7a6f]"
                        }`}
                      >
                        {saving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving...
                          </>
                        ) : savedNotes.includes(selectedBook.id) ? (
                          <>
                            <Check size={14} /> Saved with love ♡
                          </>
                        ) : changed ? (
                          "Save my note"
                        ) : (
                          <>
                            <Check size={14} /> Note saved
                          </>
                        )}
                      </button>
                    );
                  })()}
                </section>
              </>
            )}

            <p className="mt-8 text-center font-display text-sm italic text-[#8e7569]">
              Every book leaves a little something behind ♡
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
