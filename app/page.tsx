
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Heart,
  Check,
  Trash2,
  LoaderCircle,
  Sparkles,
  Star,
  Save,
} from "lucide-react";

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
  status: "watchlist" | "watched";
  rating: number | null;
  review: string;
  is_favorite: boolean;
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

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 3000);
  }

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
    const next = movie.status === "watched" ? "watchlist" : "watched";

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
      showToast(
        next === "watched"
          ? `${movie.title} — watched! ♡`
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
      showToast(
        next ? `Added to your favourites ♡` : `Removed from favourites`
      );
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
      await loadMovies();
      showToast(`${movie.title} removed from your diary`);
    }
  }

  const visible = movies.filter(
    (movie) =>
      tab === "all" ||
      (tab === "favourites"
        ? movie.is_favorite
        : movie.status === tab)
  );

  return (
    <main className="min-h-screen overflow-x-clip bg-[#faf5ed] px-4 pb-8 pt-5 text-[#633747] sm:px-6 sm:pt-7 md:px-10">
      <style jsx global>{`
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
          z-index: 110;
          bottom: calc(20px + env(safe-area-inset-bottom));
          left: 50%;
          animation: toast-appear 3s ease-in-out forwards;
          pointer-events: none;
        }
        .heart-pop { animation: heart-pop .45s ease-out; }
        .star-pop { animation: star-pop .35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .sparkle, .success-toast, .heart-pop, .star-pop {
            animation-duration: .01ms;
          }
        }
      `}</style>

      {celebrating && (
        <div aria-hidden="true">
          {sparklePositions.map((position, index) => (
            <span key={index} className="sparkle" style={position}>
              {index % 3 === 0 ? "★" : index % 3 === 1 ? "✧" : "✦"}
            </span>
          ))}
        </div>
      )}

      {toast && (
        <div key={toast} role="status" className="success-toast rounded-full border border-[#e7c5cb] bg-white px-6 py-3 text-sm text-[#713746] shadow-xl">
          ✨ {toast}
        </div>
      )}

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <a href="/" className="whitespace-nowrap font-serif text-2xl italic sm:text-3xl">
          reel <span className="text-[#b66c7c]">&</span> rose.
        </a>
        <a href="/login" className="min-h-11 shrink-0 rounded-full bg-[#713746] px-4 py-2 text-sm text-white sm:px-5 sm:text-base">
          {userId ? "Account ♡" : "Sign in ♡"}
        </a>
      </header>

      <section className="mx-auto max-w-6xl py-9 sm:py-12 md:py-14">
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#a26f79] sm:mb-4 sm:text-xs sm:tracking-[0.3em]">
          your personal film diary
        </p>
        <h1 className="max-w-full font-serif text-[clamp(2.55rem,9vw,3.25rem)] leading-[1.04] sm:text-5xl md:text-7xl">
          Every story leaves
          <br /> a little <i className="text-[#b66c7c]">something.</i>
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[#876d70] sm:mt-5 sm:text-base sm:leading-7">
          A little corner of the internet for your favourite movies, series,
          and stories you want to remember.
        </p>

        <form onSubmit={searchMovies} className="mt-6 flex min-h-14 w-full max-w-2xl items-center gap-1.5 rounded-2xl border border-[#e7d4cf] bg-white p-1.5 sm:mt-8 sm:gap-2 sm:p-2">
          <Search className="ml-2 shrink-0 text-[#b66c7c]" size={20} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies or TV shows..." className="min-w-0 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-[#b49a9c] sm:px-2" />
          <button disabled={busy} className="min-h-10 shrink-0 rounded-xl bg-[#713746] px-3.5 py-2 text-sm text-white disabled:opacity-50 sm:px-5 sm:text-base">
            {busy ? "Searching..." : "Search"}
          </button>
        </form>

        {message && <p role="status" className="mt-4 text-sm">{message}</p>}

        {results.length > 0 && (
          <section className="mt-7 sm:mt-8">
            <h2 className="mb-4 font-serif text-2xl">Found for you ♡</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
              {results.map((movie) => (
                <article key={`${movie.media_type}-${movie.id}`}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#ead9d1]">
                    {movie.poster_path ? (
                      <Image fill unoptimized src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={`${movie.title} poster`} className="object-cover" />
                    ) : <div className="p-4">Poster unavailable</div>}
                  </div>
                  <h3 className="mt-2 break-words font-serif text-base leading-snug sm:text-lg">{movie.title}</h3>
                  <p className="text-xs text-[#987c7c]">
                    {movie.release_date?.slice(0, 4)} · {movie.media_type === "tv" ? "Series" : "Film"}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5">{movie.overview}</p>
                  <button onClick={() => addMovie(movie)} className="mt-3 min-h-11 w-full rounded-full border border-[#d9b9b6] px-2 py-2 text-xs transition hover:bg-[#f0dfd7] active:scale-95 sm:text-sm">
                    + Add to watchlist
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 sm:mt-14">
          <h2 className="font-serif text-2xl sm:text-3xl">Your little collection</h2>
          <div className="no-scrollbar my-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:my-5 sm:flex-wrap sm:overflow-visible sm:px-0">
            {[
              ["watchlist", "Watchlist"],
              ["watched", "Watched"],
              ["favourites", "Favourites ♡"],
              ["all", "Everything"],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setTab(value)} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm sm:px-5 ${tab === value ? "border-[#713746] bg-[#713746] text-white" : "border-[#e7d4cf] bg-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {!userId ? (
            <div className="rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center sm:p-12">
              <Heart className="mx-auto mb-4 text-[#b66c7c]" size={30} />
              <h3 className="font-serif text-2xl">Your stories belong here.</h3>
              <p className="mt-2 text-sm">Sign in to save your personal collection.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d9b9b6] bg-white/60 p-7 text-center sm:p-12">
              <p className="text-4xl">🎬 🌷</p>
              <h3 className="mt-4 font-serif text-2xl">A blank page, for now.</h3>
              <p className="mt-2 text-sm">Search for a title above and add it to your diary.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {visible.map((movie) => {
                const isSavingStatus = statusBusyId === movie.entry_id;
                const isSavingRating = ratingBusyId === movie.entry_id;
                const isSavingFavorite = favoriteBusyId === movie.entry_id;
                const isSavingReview = reviewBusyId === movie.entry_id;
                const draft = reviewDrafts[movie.entry_id] ?? movie.review;
                const reviewChanged = draft !== movie.review;

                return (
                  <article key={movie.entry_id} className="min-w-0 rounded-2xl border border-[#ead9d1] bg-white p-1.5 sm:p-2">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#ead9d1]">
                      {movie.poster_path ? (
                        <Image fill unoptimized src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="object-cover" />
                      ) : <div className="p-4">Poster unavailable</div>}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="break-words font-serif text-base leading-snug sm:text-lg">{movie.title}</h3>
                        <p className="text-xs text-[#987c7c]">
                          {movie.release_date?.slice(0, 4)} · {movie.media_type === "tv" ? "Series" : "Film"}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleFavorite(movie)}
                        disabled={Boolean(favoriteBusyId)}
                        title={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                        aria-label={movie.is_favorite ? "Remove from favourites" : "Add to favourites"}
                        className={`shrink-0 rounded-full p-2 transition-all duration-200 hover:scale-110 active:scale-90 disabled:opacity-50 ${movie.is_favorite ? "bg-[#fbe8ed] text-[#c04d70]" : "bg-[#faf5ed] text-[#bda1a4] hover:text-[#c04d70]"} ${favoritePop === movie.entry_id ? "heart-pop" : ""}`}
                      >
                        <Heart size={19} fill={movie.is_favorite ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <button
                      onClick={() => updateStatus(movie)}
                      disabled={Boolean(statusBusyId)}
                      className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-xs font-medium transition-all duration-200 disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm ${
                        movie.status === "watched"
                          ? "border-[#b66c7c] bg-[#f8e8ec] text-[#713746] hover:bg-[#f1d9df]"
                          : "border-[#713746] bg-[#713746] text-white hover:bg-[#8b4a5d] active:scale-95"
                      }`}
                    >
                      {isSavingStatus ? (
                        <><LoaderCircle size={16} className="animate-spin" /> Saving...</>
                      ) : movie.status === "watched" ? (
                        <><Check size={16} /> Watched it ♡</>
                      ) : (
                        <><Heart size={16} /> I watched this</>
                      )}
                    </button>

                    {movie.status === "watched" && (
                      <div className="mt-3 rounded-xl bg-[#faf5ed] p-2.5 sm:mt-4 sm:p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-[#987c7c]">
                          Your rating
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => rateMovie(movie, star)}
                              disabled={Boolean(ratingBusyId)}
                              aria-label={`Rate ${star} out of 5 stars`}
                              className={`transition duration-150 hover:scale-125 active:scale-90 disabled:opacity-50 ${ratingPop === movie.entry_id ? "star-pop" : ""} ${star <= (movie.rating ?? 0) ? "text-[#d6a344]" : "text-[#ddc9bc]"}`}
                            >
                              <Star size={19} fill={star <= (movie.rating ?? 0) ? "currentColor" : "none"} className="sm:h-[22px] sm:w-[22px]" />
                            </button>
                          ))}

                          {isSavingRating && <LoaderCircle size={14} className="ml-1 animate-spin" />}
                        </div>

                        <p className="mt-2 min-h-5 text-xs text-[#89515f]">
                          {movie.rating
                            ? `${movie.rating}/5 — ${ratingLabels[movie.rating - 1]}`
                            : "Tap a star to rate this title"}
                        </p>

                        <div className="mt-4 border-t border-[#ead9d1] pt-3">
                          <label htmlFor={`review-${movie.entry_id}`} className="flex items-center gap-2 font-serif text-base">
                            <Sparkles size={15} className="text-[#b66c7c]" />
                            Your little review
                          </label>

                          <textarea
                            id={`review-${movie.entry_id}`}
                            value={draft}
                            onChange={(e) => {
                              setReviewDrafts((previous) => ({
                                ...previous,
                                [movie.entry_id]: e.target.value,
                              }));
                              setSavedReviews((previous) =>
                                previous.filter((id) => id !== movie.entry_id)
                              );
                            }}
                            placeholder="How did it make you feel? Write your little thoughts..."
                            rows={4}
                            className="mt-2 w-full resize-y rounded-xl border border-[#ead9d1] bg-white p-3 text-sm leading-6 outline-none transition focus:border-[#b66c7c] focus:ring-2 focus:ring-[#eacbd3]"
                          />

                          <button
                            onClick={() => saveReview(movie)}
                            disabled={isSavingReview || !reviewChanged}
                            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition-all duration-200 disabled:cursor-default ${
                              savedReviews.includes(movie.entry_id)
                                ? "bg-[#e5efe2] text-[#52704d]"
                                : reviewChanged
                                  ? "bg-[#713746] text-white hover:bg-[#8b4a5d] active:scale-95"
                                  : "border border-[#e7d4cf] bg-white text-[#987c7c]"
                            }`}
                          >
                            {isSavingReview ? (
                              <><LoaderCircle size={15} className="animate-spin" /> Saving your thoughts...</>
                            ) : savedReviews.includes(movie.entry_id) ? (
                              <><Check size={15} /> Saved with love ♡</>
                            ) : reviewChanged ? (
                              <><Save size={15} /> Save my review</>
                            ) : (
                              <><Check size={15} /> Review saved</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <button onClick={() => deleteMovie(movie)} className="mt-3 flex items-center gap-1 text-xs text-[#987c7c] transition hover:text-[#713746]">
                      <Trash2 size={13} /> Remove
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <footer className="px-2 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-[#987c7c]">
        Made with love, for the stories that stay. ♡
      </footer>
    </main>
  );
}
    