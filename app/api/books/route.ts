
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ books: [] });
    }

    const url = new URL("https://openlibrary.org/search.json");

    url.searchParams.set("q", query);
    url.searchParams.set(
      "fields",
      "key,title,author_name,first_publish_year,cover_i,isbn,publisher,number_of_pages_median,edition_key"
    );
    url.searchParams.set("limit", "20");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Book search is temporarily unavailable." },
        { status: response.status }
      );
    }

    const data = await response.json();

    const books = (data.docs || []).map((book: any) => ({
      id: book.key,
      title: book.title || "Untitled",
      authors: book.author_name || ["Unknown author"],
      publishedYear: book.first_publish_year || null,
      coverId: book.cover_i || null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      isbn: book.isbn?.[0] || "",
      publisher: book.publisher?.[0] || "",
      pageCount: book.number_of_pages_median || null,
      editionKey: book.edition_key?.[0] || "",
    }));

    return NextResponse.json({
      total: data.numFound || 0,
      books,
    });
  } catch (error) {
    console.error("Open Library API error:", error);

    return NextResponse.json(
      { error: "Unable to search books right now." },
      { status: 500 }
    );
  }
}
