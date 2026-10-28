
import { NextResponse } from "next/server";

type Item = {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};

const aliases: Record<string, string[]> = {
  dheendora: ["Dhindora"],
  dhindora: ["Dheendora"],
  "anjaana anjaane": ["Anjaana Anjaani"],
  "dilwaale dulhaniya le jaayenge": [
    "Dilwale Dulhania Le Jayenge",
    "DDLJ",
  ],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;

  const row = Array.from({ length: y.length + 1 }, (_, i) => i);

  for (let i = 1; i <= x.length; i++) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= y.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (x[i - 1] === y[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }

  return 1 - row[y.length] / Math.max(x.length, y.length);
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!query) return NextResponse.json({ results: [] });

  if (!token) {
    return NextResponse.json(
      { error: "TMDB_ACCESS_TOKEN is missing in .env.local." },
      { status: 500 }
    );
  }

  async function search(endpoint: string, term: string): Promise<Item[]> {
    const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
    url.searchParams.set("query", term);
    url.searchParams.set("include_adult", "false");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`TMDB ${endpoint} search returned HTTP ${response.status}`);
    }

    const data = await response.json();

    return (data.results ?? []).map((item: Item) => ({
      ...item,
      media_type:
        item.media_type ??
        (endpoint === "movie" ? "movie" : endpoint === "tv" ? "tv" : undefined),
    }));
  }

  try {
    const normalizedQuery = normalize(query);
    const aliasTerms = Object.entries(aliases)
      .filter(([key]) => normalize(key) === normalizedQuery)
      .flatMap(([, values]) => values);

    const terms = [...new Set([query, ...aliasTerms])];

    const attempts = await Promise.allSettled(
      terms.flatMap((term) => [
        search("multi", term),
        search("movie", term),
        search("tv", term),
      ])
    );

    let items = attempts.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    if (items.length === 0) {
      throw new Error(
        "TMDB could not be reached. Check your internet connection and access token."
      );
    }

    // If there are few results, try individual words for broader discovery.
    if (items.length < 5) {
      const words = query.split(/\s+/).filter((word) => word.length >= 3);

      const fallback = await Promise.allSettled(
        words.map((word) => search("multi", word))
      );

      items = items.concat(
        ...fallback.map((result) =>
          result.status === "fulfilled" ? result.value : []
        )
      );
    }

    const unique = new Map<string, Item>();

    for (const item of items) {
      if (!item.id || !item.media_type) continue;
      if (item.media_type !== "movie" && item.media_type !== "tv") continue;
      unique.set(`${item.media_type}-${item.id}`, item);
    }

    const results = Array.from(unique.values())
      .map((item) => {
        const title = item.title ?? item.name ?? "";
        const score = Math.max(
          similarity(query, title),
          ...aliasTerms.map((alias) => similarity(alias, title)),
          0
        );

        return {
          id: item.id,
          media_type: item.media_type,
          title,
          poster_path: item.poster_path ?? "",
          overview: item.overview ?? "",
          release_date: item.release_date ?? item.first_air_date ?? "",
          genre_ids: item.genre_ids ?? [],
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...item }) => item);

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";

    console.error("TMDB search failed:", message);

    return NextResponse.json(
      { error: `TMDB connection failed: ${message}` },
      { status: 502 }
    );
  }
}
