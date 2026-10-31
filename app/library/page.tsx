
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
import Brand from "@/components/Brand";

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

const shelves: ShelfTab[] = [
  "Want to read",
  "Currently reading",
  "Read",
  "Favourites",
];

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

export default function LibraryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [collection, setCollection] = useState<SavedBook[]>([]);
  const [activeShelf, setActiveShelf] =
    useState<ShelfTab>("Want to read");

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingBook, setAddingBook] = useState<string | null>(null);
  const [updatingBook, setUpdatingBook] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedBook =
    collection.find((book) => book.id === selectedBookId) || null;

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

  async function searchBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/books?q=${encodeURIComponent(query)}`
      );

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

    const { error: insertError } = await supabase
      .from("book_entries")
      .insert({
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
      .update({
        shelf,
        finished_on: finishedOn,
      })
      .eq("openlibrary_id", book.id);

    if (updateError) {
      console.error(updateError);
      setError("Couldn't update this book. Please try again.");
      setUpdatingBook(null);
      return;
    }

    setCollection((previous) =>
      previous.map((item) =>
        item.id === book.id
          ? {
              ...item,
              shelf,
              startedOn: item.startedOn,
              finishedOn,
            }
          : item
      )
    );

        setMessage(`Moved "${book.title}" to ${shelf}.`);

    // Wake the little cat when you finish a book
    if (shelf === "Read") {
      window.dispatchEvent(new Event("book-finished"));
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
        item.id === book.id
          ? { ...item, isFavorite: nextFavorite }
          : item
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
      previous.map((item) =>
        item.id === book.id ? { ...item, rating } : item
      )
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
      previous.map((item) =>
        item.id === bookId ? { ...item, review } : item
      )
    );
  }

  const visibleBooks = collection.filter((book) => {
    if (activeShelf === "Favourites") return book.isFavorite;
    return book.shelf === activeShelf;
  });

  const alreadyAddedIds = new Set(collection.map((book) => book.id));

  return (
    <main className="min-h-screen bg-[#faf7f2] text-[#51463e]">

<MagicalMushrooms />
        <SleepyCat />
      <style jsx global>{`
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
        .book-spine {
          transform-origin: bottom center;
          box-shadow: inset 5px 0 8px #2c1b1b25, inset -2px 0 3px #fff8, 3px 5px 10px #4d38251c;
          transition: transform .28s ease, box-shadow .28s ease;
        }
        .book-spine:hover {
          transform: translateY(-9px) rotate(-1.5deg);
          box-shadow: inset 5px 0 8px #2c1b1b25, inset -2px 0 3px #fff8, 5px 12px 18px #4d382533;
        }
        @media (prefers-reduced-motion: reduce) {
          .book-spine { transition: none; }
          .book-spine:hover { transform: none; }
        }
      /* Books that breathe */
.book-breath {
  transform-origin: bottom center;
  animation: book-breathe 4.5s ease-in-out infinite;
  transition:
    transform 0.4s cubic-bezier(.2,.8,.2,1),
    box-shadow 0.4s ease;
}

.book-breath:nth-child(2n) {
  animation-delay: -1.4s;
}

.book-breath:nth-child(3n) {
  animation-delay: -2.7s;
}

.group:hover .book-breath {
  animation-play-state: paused;
  transform: translateY(-9px) rotate(-2deg) scale(1.025);
}

@keyframes book-breathe {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(0.6deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .book-breath {
    animation: none;
    transition: none;
  }

  .group:hover .book-breath {
    transform: none;
  }
}`
      
      }</style>
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 lg:px-12">

        {/* Header */}
        <header className="mb-10">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-2 text-sm text-[#96877c] transition hover:text-[#51463e]"
          >
            <ArrowLeft size={16} />
            Back to reel & rose
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#ad8c7d]">
                Stories, little escapes & favourite words
              </p>

              <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
                The Library<span className="text-[#c58f85]">.</span>
              </h1>

              <p className="mt-3 text-sm text-[#94877d]">
                A little home for all the books you love.
              </p>
            </div>

            <div className="font-serif text-lg italic text-[#b18e80]">
              So many books, so little time ♡
            </div>
          </div>
        </header>

        {/* Search */}
        <section className="mb-12 rounded-[2rem] border border-[#eee4da] bg-[#fffdfa] p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles size={19} className="text-[#bd9385]" />
            <h2 className="font-serif text-2xl">Find a new story</h2>
          </div>

          <form
            onSubmit={searchBooks}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 rounded-full border border-[#eadfd5] bg-white px-5 py-3">
              <Search size={17} className="text-[#ae9688]" />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by book or author..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#b5aaa1]"
              />
            </div>

            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="rounded-full bg-[#94766b] px-8 py-3 text-sm text-white transition hover:bg-[#806257] disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-xl">Found for you</h3>
                <button
                  onClick={() => setSearchResults([])}
                  className="text-xs text-[#98776b]"
                >
                  Close results
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((book) => {
                  const isAdded = alreadyAddedIds.has(book.id);

                  return (
                    <div
                      key={book.id}
                      className="flex gap-4 rounded-2xl border border-[#eee4da] bg-white p-4"
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
                        <h4 className="line-clamp-2 font-serif text-base">
                          {book.title}
                        </h4>

                        <p className="mt-1 line-clamp-2 text-xs text-[#96877c]">
                          {book.authors?.join(", ") || "Unknown author"}
                        </p>

                        <button
                          onClick={() => addBook(book)}
                          disabled={isAdded || addingBook === book.id}
                          className="mt-auto pt-3 text-left text-xs text-[#98776b] disabled:opacity-50"
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
        </section>

        {/* Messages */}
        {error && (
          <p className="mb-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a45e53]">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-5 rounded-xl bg-[#f1f5ec] px-4 py-3 text-sm text-[#687e61]">
            {message}
          </p>
        )}

        {/* Bookshelf */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[#ad8c7d]">
                Your little collection
              </p>
              <h2 className="font-serif text-3xl">My books</h2>
            </div>

            <p className="text-sm text-[#a3978d]">
              A shelf for every reading mood.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-2 overflow-x-auto border-b border-[#e9dfd6] pb-3">
            {shelves.map((shelf) => {
              const count =
                shelf === "Favourites"
                  ? collection.filter((book) => book.isFavorite).length
                  : collection.filter((book) => book.shelf === shelf).length;

              const active = activeShelf === shelf;

              return (
                <button
                  key={shelf}
                  onClick={() => setActiveShelf(shelf)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm transition ${
                    active
                      ? "bg-[#94766b] text-white"
                      : "bg-[#f1ebe4] text-[#81746a] hover:bg-[#e9dfd6]"
                  }`}
                >
                  {shelf === "Favourites" && <Heart size={14} />}
                  {shelf}
                  <span className={active ? "text-white/70" : "text-[#ad9e92]"}>
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
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#dfd2c7] bg-[#fffdfa] px-6 text-center">
              <div className="mb-4 rounded-full bg-[#f4e8e2] p-4 text-[#a9786d]">
                {activeShelf === "Favourites" ? (
                  <Heart size={25} />
                ) : (
                  <BookOpen size={25} />
                )}
              </div>

              <h3 className="font-serif text-2xl">
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

          {/* Books on a little wooden shelf */}
          {!loading && visibleBooks.length > 0 && (
            <div className="bookshelf-grid grid grid-cols-3 items-end gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-5 xl:grid-cols-6">
              {visibleBooks.map((book) => (
                <article key={book.id} className="group relative flex min-w-0 flex-col">
                  <button
                    onClick={() => setSelectedBookId(book.id)}
                    className="relative mx-auto block w-full max-w-[150px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-4"
                    aria-label={`Open ${book.title}`}
                  >
<div className="book-breath relative mx-auto aspect-[0.68/1] w-full overflow-hidden rounded-[1.05rem] bg-[linear-gradient(135deg,#e7b6a8,#d6b7d9,#b8c9a9,#efcf91)] p-[3px] shadow-[0_5px_16px_rgba(91,58,48,0.12)] group-hover:shadow-[0_12px_25px_rgba(91,58,48,0.22)]">                      <div className="h-full w-full overflow-hidden rounded-[0.9rem] bg-[#eee5dc] ring-1 ring-inset ring-white/70">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={`${book.title} book cover`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#f4e3d9] via-[#ead7df] to-[#e5e8d9] px-3 text-center">
                            <BookOpen size={30} className="text-[#9b766f]" />
                            <span className="font-serif text-sm text-[#633747]">{book.title}</span>
                            <span className="text-[10px] text-[#8c7770]">{book.authors?.[0] || "A little story"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 px-1 text-center">
                      <h3 className="line-clamp-2 min-h-10 font-serif text-sm leading-5 text-[#51463e] sm:text-base">{book.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-[#96877c]">{book.authors?.join(", ") || "Unknown author"}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-wide text-[#a17f70] opacity-0 transition group-hover:opacity-100">
                        <BookOpen size={11} /> Open book
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleFavorite(book)}
                    disabled={updatingBook === book.id}
                    aria-label={book.isFavorite ? "Remove from favourites" : "Add to favourites"}
                    className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#bd887f] shadow-md transition-all duration-200 hover:scale-110 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#b66c7c] focus:ring-offset-2 disabled:opacity-50"
                  >
                    <Heart size={16} fill={book.isFavorite ? "currentColor" : "none"} />
                  </button>

                                    {(activeShelf === "Want to read" ||
                    activeShelf === "Currently reading") && (
                    <div className="mt-3 flex w-full flex-col gap-2">

                      {activeShelf === "Want to read" && (
                        <button
                          onClick={() =>
                            changeShelf(book, "Currently reading")
                          }
                          disabled={updatingBook === book.id}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#b66c7c] bg-[#b66c7c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#a65d6e] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b66c7c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
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
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#65705c] bg-[#65705c] px-2 py-2.5 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#56604d] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65705c] focus-visible:ring-offset-2 disabled:opacity-60 sm:text-xs"
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
          <p className="font-serif text-xl italic text-[#8e7569]">
            One more chapter, always ♡
          </p>

          <p className="mt-2 text-xs tracking-wide text-[#b0a298]">
            part of reel & rose
          </p>

          <Link
            href="/cinema"
            className="mt-5 inline-flex items-center gap-2 text-sm text-[#94766b] transition hover:text-[#65564c]"
          >
            <Sparkles size={15} />
            Visit The Cinema
          </Link>
        </footer>
      </div>

      {/* Book details popup */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#352b27]/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedBookId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedBook.title} details`}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#eee4da] bg-[#fffdfa] p-6 shadow-2xl sm:p-8"
          >
            <button
              onClick={() => setSelectedBookId(null)}
              aria-label="Close book details"
              className="absolute right-5 top-5 rounded-full bg-[#f4eee8] p-2 text-[#8d776b] transition hover:bg-[#eadfd5]"
            >
              <X size={18} />
            </button>

            {/* Book information */}
            <div className="flex gap-5 pr-8 sm:gap-7">
              <div className="h-44 w-28 shrink-0 overflow-hidden rounded-xl bg-[#eee5dc] shadow-md sm:h-52 sm:w-36">
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
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#b18e80]">
                  A story in your collection
                </p>

                <h2 className="font-serif text-2xl leading-tight text-[#51463e] sm:text-3xl">
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

            {/* Reading dates */}
            <section>
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[#ad8c7d]">
                Your reading journey
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#a18f82]">Added to shelf</p>
                  <p className="mt-2 font-serif text-base text-[#65564c]">
                    {formatDate(selectedBook.startedOn)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8f2ec] p-4">
                  <p className="text-xs text-[#a18f82]">Finished reading</p>
                  <p className="mt-2 font-serif text-base text-[#65564c]">
                    {formatDate(selectedBook.finishedOn)}
                  </p>
                </div>
              </div>
            </section>

            {/* Rating */}
            {selectedBook.shelf === "Read" && (
              <>
                <div className="my-7 border-t border-[#eee5dc]" />

                <section>
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#ad8c7d]">
                    How much did you love it?
                  </p>

                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => saveRating(selectedBook, star)}
                        disabled={updatingBook === selectedBook.id}
                        aria-label={`Rate ${star} out of 5`}
                        className="transition hover:scale-110 disabled:opacity-50"
                      >
                        <Star
                          size={25}
                          fill={
                            selectedBook.rating && selectedBook.rating >= star
                              ? "#c99b65"
                              : "none"
                          }
                          className={
                            selectedBook.rating && selectedBook.rating >= star
                              ? "text-[#c99b65]"
                              : "text-[#d8c9b9]"
                          }
                        />
                      </button>
                    ))}

                    {selectedBook.rating && (
                      <span className="ml-2 text-xs text-[#a58b7b]">
                        {selectedBook.rating}/5
                      </span>
                    )}
                  </div>
                </section>

                <div className="my-7 border-t border-[#eee5dc]" />

                {/* Personal note */}
                <section>
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#ad8c7d]">
                    Your little book diary
                  </p>

                  <textarea
                    value={selectedBook.review || ""}
                    onChange={(event) =>
                      updateReview(selectedBook.id, event.target.value)
                    }
                    placeholder="Favourite lines, little thoughts, how it made you feel..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-[#eee1d6] bg-white p-4 text-sm leading-7 text-[#65564c] outline-none placeholder:text-[#b5aaa1] focus:border-[#c8a99a]"
                  />

                  <button
                    onClick={() => saveReview(selectedBook)}
                    disabled={updatingBook === selectedBook.id}
                    className="mt-3 rounded-full bg-[#94766b] px-6 py-2.5 text-xs text-white transition hover:bg-[#806257] disabled:opacity-50"
                  >
                    {updatingBook === selectedBook.id
                      ? "Saving..."
                      : "Save my note"}
                  </button>
                </section>
              </>
            )}

            <p className="mt-8 text-center font-serif text-sm italic text-[#b18e80]">
              Every book leaves a little something behind ♡
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

