"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Heart,
  Loader2,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SleepyCat from "@/components/SleepyCat";
import MagicalMushrooms from "@/components/MagicalMushrooms";

type Shelf = "Want to read" | "Currently reading" | "Read";
type ShelfTab = Shelf | "Favourites";

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

const shelves: ShelfTab[] = [
  "Want to read",
  "Currently reading",
  "Read",
  "Favourites",
];

const searchHints = [
  "Search for a book…",
  "Try “Pride and Prejudice”…",
  "Try “Haruki Murakami”…",
  "Try “a cosy mystery”…",
  "Try “Jane Austen”…",
];

const petalSymbols = ["🌹", "🌸", "✿", "❀", "🍃"];

/* ---------- helpers ---------- */

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

/** Counts up from 0 to target with an ease-out curve */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/** Types and erases a list of phrases, for the search placeholder */
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

/** 3D tilt + moving shine that follows the cursor */
function handleTilt(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  el.style.setProperty("--ry", `${x * 18}deg`);
  el.style.setProperty("--rx", `${-y * 18}deg`);
  el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
  el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
}

function resetTilt(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--ry", "0deg");
  el.style.setProperty("--rx", "0deg");
}

function StatCard({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  const shown = useCountUp(value);

  return (
    <div
      className="stat-card rounded-3xl border border-white/70 bg-white/55 px-5 py-4 backdrop-blur-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-display text-4xl text-[#633747] sm:text-5xl">
        {shown}
      </p>
      <p className="mt-1 text-xs text-[#96877c]">{label}</p>
    </div>
  );
}

/* ---------- page ---------- */

export default function LibraryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [collection, setCollection] = useState<SavedBook[]>([]);
  const [activeShelf, setActiveShelf] = useState<ShelfTab>("Want to read");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingBook, setAddingBook] = useState<string | null>(null);
  const [updatingBook, setUpdatingBook] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [petals, setPetals] = useState<Petal[]>([]);

  const petalCounter = useRef(0);
  const placeholder = useTypewriter(searchHints);

  const selectedBook =
    collection.find((book) => book.id === selectedBookId) || null;

  /* ---- data ---- */

  const loadCollection = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please log in to view your library.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("book_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError("Couldn't load your library. Please try again.");
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
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  /* ---- celebration ---- */

  function releasePetals() {
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

  /* ---- actions ---- */

  async function searchBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");

      const result = await response.json();
      setSearchResults(result.books || []);
    } catch (err) {
      console.error(err);
      setError("Couldn't search for books. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function addBook(book: Book) {
    setAddingBook(book.id);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in before adding books.");
      setAddingBook(null);
      return;
    }

    if (collection.some((item) => item.id === book.id)) {
      setError("This book is already in your library.");
      setAddingBook(null);
      return;
    }

    const today = getLocalDate();

    const { error: insertError } = await supabase.from("book_entries").insert({
      user_id: user.id,
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
      setError(
        insertError.code === "23505"
          ? "This book is already in your library."
          : "Couldn't add this book. Please try again."
      );
      setAddingBook(null);
      return;
    }

    setCollection((previous) => [
      {
        ...book,
        shelf: "Want to read",
        rating: null,
        review: null,
        isFavorite: false,
        startedOn: today,
        finishedOn: null,
      },
      ...previous,
    ]);

    setSearchResults([]);
    setSearchQuery("");
    setMessage(`"${book.title}" has found a place on your shelf.`);
    setAddingBook(null);
  }

  async function changeShelf(book: SavedBook, shelf: Shelf) {
    if (book.shelf === shelf) return;

    setUpdatingBook(book.id);
    setError("");
    setMessage("");

    const today = getLocalDate();

    const finishedOn =
      shelf === "Read"
        ? today
        : shelf === "Want to read"
          ? null
          : book.finishedOn;

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ shelf, finished_on: finishedOn })
      .eq("openlibrary_id", book.id);

    if (updateError) {
      console.error(updateError);
      setError("Couldn't update this book. Please try again.");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id ? { ...item, shelf, finishedOn } : item
      )
    );

    setMessage(`Moved "${book.title}" to ${shelf}.`);

    if (shelf === "Read") {
      window.dispatchEvent(new Event("book-finished"));
      releasePetals();
    }

    setUpdatingBook(null);
  }

  async function toggleFavorite(book: SavedBook) {
    setUpdatingBook(book.id);

    const nextFavorite = !book.isFavorite;

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ is_favorite: nextFavorite })
      .eq("openlibrary_id", book.id);

    if (updateError) {
      console.error(updateError);
      setError("Couldn't update your favourites.");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id ? { ...item, isFavorite: nextFavorite } : item
      )
    );

    setUpdatingBook(null);
  }

  async function saveRating(book: SavedBook, rating: number) {
    setUpdatingBook(book.id);

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ rating })
      .eq("openlibrary_id", book.id);

    if (updateError) {
      console.error(updateError);
      setError("Couldn't save your rating.");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) => (item.id === book.id ? { ...item, rating } : item))
    );

    setUpdatingBook(null);
  }

  async function saveReview(book: SavedBook) {
    setUpdatingBook(book.id);

    const { error: updateError } = await supabase
      .from("book_entries")
      .update({ review: book.review || null })
      .eq("openlibrary_id", book.id);

    if (updateError) {
      console.error(updateError);
      setError("Couldn't save your note.");
      setUpdatingBook(null);
      return;
    }

    setMessage("Your little note has been saved.");
    setUpdatingBook(null);
  }

  function updateReview(bookId: string, review: string) {
    setCollection((previous) =>
      previous.map((item) => (item.id === bookId ? { ...item, review } : item))
    );
  }

  /* ---- derived ---- */

  const visibleBooks = collection.filter((book) => {
    if (activeShelf === "Favourites") return book.isFavorite;
    return book.shelf === activeShelf;
  });

  const alreadyAddedIds = new Set(collection.map((book) => book.id));

  const activeIndex = shelves.indexOf(activeShelf);

  const counts = {
    total: collection.length,
    reading: collection.filter((b) => b.shelf === "Currently reading").length,
    read: collection.filter((b) => b.shelf === "Read").length,
    favourites: collection.filter((b) => b.isFavorite).length,
  };

  const fanBooks = collection.slice(0, 3);

  const marqueeItems =
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

  const heroLetters = "The Library".split("");

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
        .aurora span:nth-child(1) {
          width: 420px; height: 420px; top: -120px; left: -80px;
          background: #f2c3b8;
        }
        .aurora span:nth-child(2) {
          width: 380px; height: 380px; top: 80px; right: -100px;
          background: #d9c5ee; animation-delay: -6s;
        }
        .aurora span:nth-child(3) {
          width: 340px; height: 340px; top: 520px; left: 30%;
          background: #cfe0bd; animation-delay: -11s;
        }
        .aurora span:nth-child(4) {
          width: 300px; height: 300px; top: 900px; right: 8%;
          background: #f5dba3; animation-delay: -3s;
        }
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
        @keyframes fade-in {
          to { opacity: 1; }
        }

        /* ---------- cover fan ---------- */
        .fan-card {
          position: absolute;
          width: 132px;
          aspect-ratio: 0.68 / 1;
          border-radius: 14px;
          overflow: hidden;
          border: 3px solid #fffdfa;
          box-shadow: 0 18px 34px rgba(91, 58, 48, 0.25);
          animation: fan-float 5s ease-in-out infinite;
        }
        .fan-card:nth-child(1) { left: 0;    top: 38px; --r: -13deg; animation-delay: -1s; }
        .fan-card:nth-child(2) { left: 62px; top: 6px;  --r: 2deg;   animation-delay: -2.4s; z-index: 2; }
        .fan-card:nth-child(3) { left: 124px; top: 44px; --r: 14deg; animation-delay: -3.6s; z-index: 1; }
        @keyframes fan-float {
          0%, 100% { transform: translateY(0) rotate(var(--r)); }
          50% { transform: translateY(-12px) rotate(calc(var(--r) + 2deg)); }
        }

        /* ---------- marquee ---------- */
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 38s linear infinite;
        }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        @keyframes marquee {
          to { transform: translateX(-50%); }
        }

        /* ---------- stats ---------- */
        .stat-card {
          opacity: 0;
          animation: stat-pop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards;
        }
        @keyframes stat-pop {
          from { opacity: 0; transform: translateY(24px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

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
          background: conic-gradient(
            from var(--angle),
            #f2c3b8, #d9c5ee, #cfe0bd, #f5dba3, #f2c3b8
          );
          animation: spin-angle 7s linear infinite;
        }
        @keyframes spin-angle {
          to { --angle: 360deg; }
        }

        /* ---------- tabs ---------- */
        .tab-indicator {
          transition: transform 0.45s cubic-bezier(0.3, 1.25, 0.4, 1);
        }

        /* ---------- shelf + books ---------- */
        .bookshelf-grid {
          position: relative;
          isolation: isolate;
          padding-bottom: 22px;
        }
        .bookshelf-grid::after {
          content: "";
          position: absolute;
          z-index: -1;
          left: -8px;
          right: -8px;
          bottom: 5px;
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
          --rx: 0deg;
          --ry: 0deg;
          --mx: 50%;
          --my: 50%;
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
          background: radial-gradient(
            circle at var(--mx) var(--my),
            rgba(255, 255, 255, 0.55),
            transparent 55%
          );
        }
        .group:hover .tilt::after { opacity: 1; }

        .spine-edge {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 9px;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(40,20,20,0.28), transparent);
          z-index: 2;
        }

        /* ---------- messages + modal ---------- */
        .toast-in { animation: toast-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-pop { animation: modal-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
        @keyframes modal-pop {
          from { opacity: 0; transform: translateY(30px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .star-btn { transition: transform 0.25s cubic-bezier(0.3, 1.8, 0.5, 1); }
        .star-btn:hover { transform: scale(1.3) rotate(-12deg); }

        /* ---------- petals ---------- */
        .petal {
          position: fixed;
          top: -40px;
          z-index: 60;
          pointer-events: none;
          animation: petal-fall linear forwards;
        }
        @keyframes petal-fall {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          50%  { transform: translate3d(60px, 55vh, 0) rotate(200deg); }
          100% { transform: translate3d(-40px, 110vh, 0) rotate(420deg); opacity: 0.2; }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora span,
          .hero-dot,
          .fan-card,
          .marquee-track,
          .glow-border,
          .book-breath,
          .petal { animation: none; }
          .hero-letter, .hero-sub, .stat-card, .book-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .tilt { transform: none; }
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
        {/* Hero */}
        <header className="mb-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#96877c] transition hover:-translate-x-1 hover:text-[#51463e]"
          >
            <ArrowLeft size={16} />
            Back to reel & rose
          </Link>

          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-display text-6xl leading-[0.95] tracking-tight text-[#51463e] sm:text-8xl">
                <span aria-label="The Library.">
                  {heroLetters.map((letter, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className="hero-letter"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      {letter === " " ? "\u00A0" : letter}
                    </span>
                  ))}
                  <span className="hero-dot" aria-hidden="true">.</span>
                </span>
              </h1>

              <p className="hero-sub mt-5 max-w-md font-display text-lg italic text-[#a07f72]">
                A little home for every book you love. So many stories, so
                little time ♡
              </p>
            </div>

            {/* floating cover fan */}
            <div
              className="relative hidden h-64 w-64 shrink-0 sm:block"
              aria-hidden="true"
            >
              {(fanBooks.length > 0
                ? fanBooks
                : ([null, null, null] as (SavedBook | null)[])
              ).map((book, index) => (
                <div
                  key={book?.id ?? index}
                  className="fan-card bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9]"
                >
                  {book?.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#9b766f]">
                      <BookOpen size={30} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Marquee of titles */}
        <div className="marquee-wrap -mx-5 mb-10 overflow-hidden border-y border-[#eadfd5]/80 bg-white/40 py-3 backdrop-blur-sm sm:-mx-8 lg:-mx-12">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((title, index) => (
              <span
                key={index}
                className="flex shrink-0 items-center gap-6 pr-6 font-display text-lg italic text-[#a07f72]"
              >
                {title}
                <Heart size={12} className="text-[#d9a49a]" fill="currentColor" />
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard label="books in your library" value={counts.total} delay={0} />
          <StatCard label="reading right now" value={counts.reading} delay={90} />
          <StatCard label="stories finished" value={counts.read} delay={180} />
          <StatCard label="favourites" value={counts.favourites} delay={270} />
        </section>

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
              <div className="flex flex-1 items-center gap-3 rounded-full border border-[#eadfd5] bg-white px-5 py-3 transition focus-within:border-[#c8a99a] focus-within:shadow-[0_0_0_4px_rgba(200,169,154,0.2)]">
                <Search size={17} className="text-[#ae9688]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={placeholder || " "}
                  aria-label="Search by book or author"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#b5aaa1]"
                />
              </div>

              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="rounded-full bg-[#94766b] px-8 py-3 text-sm text-white transition hover:-translate-y-0.5 hover:bg-[#806257] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-xl">Found for you</h3>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-xs text-[#98776b]"
                  >
                    Close results
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((book, index) => {
                    const isAdded = alreadyAddedIds.has(book.id);

                    return (
                      <div
                        key={book.id}
                        className="book-enter flex gap-4 rounded-2xl border border-[#eee4da] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="h-28 w-[74px] shrink-0 overflow-hidden rounded-lg bg-[#f1eae2]">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#b49b8d]">
                              <BookOpen size={25} />
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <h4 className="line-clamp-2 font-display text-base">
                            {book.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-xs text-[#96877c]">
                            {book.authors?.join(", ") || "Unknown author"}
                          </p>

                          <button
                            onClick={() => addBook(book)}
                            disabled={isAdded || addingBook === book.id}
                            className="mt-auto pt-3 text-left text-xs text-[#98776b] transition hover:translate-x-1 disabled:opacity-50"
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

        {/* Messages */}
        {error && (
          <p
            key={error}
            className="toast-in mb-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a45e53]"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            key={message}
            className="toast-in mb-5 rounded-xl bg-[#f1f5ec] px-4 py-3 text-sm text-[#687e61]"
          >
            {message}
          </p>
        )}

        {/* Bookshelf */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-4xl">My books</h2>
            <p className="text-sm text-[#a3978d]">
              A shelf for every reading mood.
            </p>
          </div>

          {/* Tabs with sliding pill */}
          <div
            role="tablist"
            className="relative mb-10 grid grid-cols-4 rounded-full border border-[#e9dfd6] bg-white/60 p-1 backdrop-blur-sm"
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
              const count =
                shelf === "Favourites"
                  ? counts.favourites
                  : collection.filter((book) => book.shelf === shelf).length;

              const active = activeShelf === shelf;

              return (
                <button
                  key={shelf}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveShelf(shelf)}
                  className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2.5 text-center text-[11px] leading-tight transition-colors duration-300 sm:flex-row sm:gap-2 sm:text-sm ${
                    active ? "text-white" : "text-[#81746a] hover:text-[#51463e]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {shelf === "Favourites" && <Heart size={13} />}
                    {shelf}
                  </span>
                  <span className={active ? "text-white/75" : "text-[#ad9e92]"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="animate-spin text-[#a58b7b]" size={25} />
            </div>
          )}

          {/* Empty shelf */}
          {!loading && visibleBooks.length === 0 && (
            <div
              key={activeShelf}
              className="book-enter flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#dfd2c7] bg-white/60 px-6 text-center backdrop-blur-sm"
            >
              <div className="mb-4 animate-bounce rounded-full bg-[#f4e8e2] p-4 text-[#a9786d]">
                {activeShelf === "Favourites" ? (
                  <Heart size={25} />
                ) : (
                  <BookOpen size={25} />
                )}
              </div>

              <h3 className="font-display text-2xl">
                {activeShelf === "Favourites"
                  ? "No favourites just yet"
                  : "A little room for a new story"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[#9b8e84]">
                {activeShelf === "Want to read"
                  ? "Search for a book above and add it to your shelf."
                  : activeShelf === "Currently reading"
                    ? "Move a book here whenever you start reading."
                    : activeShelf === "Read"
                      ? "The books you've finished will appear here."
                      : "Tap the little heart on a book to save it here."}
              </p>
            </div>
          )}

          {/* Books on a wooden shelf (re-keyed so every tab switch replays the entrance) */}
          {!loading && visibleBooks.length > 0 && (
            <div
              key={activeShelf}
              className="bookshelf-grid grid grid-cols-3 items-end gap-x-4 gap-y-10 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-5 xl:grid-cols-6"
            >
              {visibleBooks.map((book, index) => (
                <article
                  key={book.id}
                  className="book-enter book-breath-wrap group relative flex min-w-0 flex-col"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <button
                    onClick={() => setSelectedBookId(book.id)}
                    className="relative mx-auto block w-full max-w-[150px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-4"
                    aria-label={`Open ${book.title}`}
                  >
                    <div className="book-breath">
                      <div
                        className="tilt aspect-[0.68/1] w-full overflow-hidden rounded-[1.05rem] bg-[linear-gradient(135deg,#e7b6a8,#d6b7d9,#b8c9a9,#efcf91)] p-[3px] shadow-[0_5px_16px_rgba(91,58,48,0.14)] group-hover:shadow-[0_18px_30px_rgba(91,58,48,0.28)]"
                        onMouseMove={handleTilt}
                        onMouseLeave={resetTilt}
                      >
                        <span className="spine-edge" />
                        <div className="h-full w-full overflow-hidden rounded-[0.9rem] bg-[#eee5dc] ring-1 ring-inset ring-white/70">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={`${book.title} book cover`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9] px-3 text-center">
                              <BookOpen size={30} className="text-[#9b766f]" />
                              <span className="font-display text-sm text-[#633747]">
                                {book.title}
                              </span>
                              <span className="text-[10px] text-[#8c7770]">
                                {book.authors?.[0] || "A little story"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 px-1 text-center">
                      <h3 className="line-clamp-2 min-h-10 font-display text-sm leading-5 text-[#51463e] sm:text-base">
                        {book.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-[#96877c]">
                        {book.authors?.join(", ") || "Unknown author"}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-wide text-[#a17f70] opacity-0 transition group-hover:opacity-100">
                        <BookOpen size={11} /> Open book
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleFavorite(book)}
                    disabled={updatingBook === book.id}
                    aria-label={
                      book.isFavorite
                        ? "Remove from favourites"
                        : "Add to favourites"
                    }
                    className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#bd887f] shadow-md transition-all duration-200 hover:scale-125 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#b66c7c] focus:ring-offset-2 disabled:opacity-50"
                  >
                    <Heart
                      size={16}
                      fill={book.isFavorite ? "currentColor" : "none"}
                      className={book.isFavorite ? "animate-pulse" : ""}
                    />
                  </button>

                  {(activeShelf === "Want to read" ||
                    activeShelf === "Currently reading") && (
                    <div className="mt-3 flex w-full flex-col gap-2">
                      {activeShelf === "Want to read" && (
                        <button
                          onClick={() => changeShelf(book, "Currently reading")}
                          disabled={updatingBook === book.id}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#b66c7c] bg-[#b66c7c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a65d6e] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
                        >
                          <BookOpen size={14} />
                          {updatingBook === book.id
                            ? "Moving..."
                            : "Currently reading"}
                        </button>
                      )}

                      <button
                        onClick={() => changeShelf(book, "Read")}
                        disabled={updatingBook === book.id}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#65705c] bg-[#65705c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#56604d] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65705c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
                      >
                        <Check size={14} />
                        {updatingBook === book.id
                          ? "Moving..."
                          : "I've finished it"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[#e9dfd6] pt-8 text-center">
          <p className="font-display text-xl italic text-[#8e7569]">
            One more chapter, always ♡
          </p>
          <p className="mt-2 text-xs tracking-wide text-[#b0a298]">
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

      {/* Book details popup */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#352b27]/50 p-4 backdrop-blur-md"
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
              onClick={() => setSelectedBookId(null)}
              aria-label="Close book details"
              className="absolute right-5 top-5 z-10 rounded-full bg-[#f4eee8] p-2 text-[#8d776b] transition hover:rotate-90 hover:bg-[#eadfd5]"
            >
              <X size={18} />
            </button>

            <div className="flex gap-5 pr-8 sm:gap-7">
              <div
                className="tilt h-44 w-28 shrink-0 overflow-hidden rounded-xl bg-[#eee5dc] shadow-xl sm:h-52 sm:w-36"
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
              >
                {selectedBook.coverUrl ? (
                  <img
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#aa9385]">
                    <BookOpen size={35} />
                  </div>
                )}
              </div>

              <div className="min-w-0 self-center">
                <p className="mb-2 text-xs text-[#b18e80]">
                  A story in your collection
                </p>

                <h2 className="font-display text-2xl leading-tight text-[#51463e] sm:text-3xl">
                  {selectedBook.title}
                </h2>

                <p className="mt-2 text-sm text-[#96877c]">
                  {selectedBook.authors?.join(", ") || "Unknown author"}
                </p>

                {selectedBook.publishedYear && (
                  <p className="mt-1 text-xs text-[#b0a298]">
                    {selectedBook.publishedYear}
                  </p>
                )}

                <span className="mt-4 inline-flex rounded-full bg-[#f4e8e2] px-3 py-1.5 text-xs text-[#98776b]">
                  {selectedBook.shelf}
                </span>
              </div>
            </div>

            <div className="my-7 border-t border-[#eee5dc]" />

            <section>
              <p className="mb-4 text-sm text-[#ad8c7d]">Your reading journey</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#a18f82]">Added to shelf</p>
                  <p className="mt-2 font-display text-base text-[#65564c]">
                    {formatDate(selectedBook.startedOn)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#a18f82]">Finished reading</p>
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
                  <p className="mb-3 text-sm text-[#ad8c7d]">
                    How much did you love it?
                  </p>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const filled =
                        !!selectedBook.rating && selectedBook.rating >= star;

                      return (
                        <button
                          key={star}
                          onClick={() => saveRating(selectedBook, star)}
                          disabled={updatingBook === selectedBook.id}
                          aria-label={`Rate ${star} out of 5`}
                          className="star-btn disabled:opacity-50"
                        >
                          <Star
                            size={25}
                            fill={filled ? "#c99b65" : "none"}
                            className={filled ? "text-[#c99b65]" : "text-[#d8c9b9]"}
                          />
                        </button>
                      );
                    })}

                    {selectedBook.rating && (
                      <span className="ml-2 text-xs text-[#a58b7b]">
                        {selectedBook.rating}/5
                      </span>
                    )}
                  </div>
                </section>

                <div className="my-7 border-t border-[#eee5dc]" />

                <section>
                  <p className="mb-3 text-sm text-[#ad8c7d]">
                    Your little book diary
                  </p>

                  <textarea
                    value={selectedBook.review || ""}
                    onChange={(event) =>
                      updateReview(selectedBook.id, event.target.value)
                    }
                    placeholder="Favourite lines, little thoughts, how it made you feel..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-[#eee1d6] bg-white p-4 text-sm leading-7 text-[#65564c] outline-none transition placeholder:text-[#b5aaa1] focus:border-[#c8a99a] focus:shadow-[0_0_0_4px_rgba(200,169,154,0.2)]"
                  />

                  <button
                    onClick={() => saveReview(selectedBook)}
                    disabled={updatingBook === selectedBook.id}
                    className="mt-3 rounded-full bg-[#94766b] px-6 py-2.5 text-xs text-white transition hover:-translate-y-0.5 hover:bg-[#806257] hover:shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {updatingBook === selectedBook.id
                      ? "Saving..."
                      : "Save my note"}
                  </button>
                </section>
              </>
            )}

            <p className="mt-8 text-center font-display text-sm italic text-[#b18e80]">
              Every book leaves a little something behind ♡
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
