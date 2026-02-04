import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/cataloging/enrich
 * Enriquece dados de livro usando ISBN ou título via APIs externas
 * (Google Books, Open Library, etc.)
 */

const enrichSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author } = enrichSchema.parse(body);

    // Validar que ao menos ISBN ou título foi fornecido
    if (!isbn && !title) {
      return NextResponse.json(
        { error: "ISBN ou título é obrigatório" },
        { status: 400 },
      );
    }

    let enrichedData = null;

    // 1. Tentar enriquecer via ISBN (Google Books API)
    if (isbn) {
      try {
        const googleResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.GOOGLE_BOOKS_API_KEY || ""}`,
        );

        if (googleResponse.ok) {
          const data = await googleResponse.json();
          if (data.items && data.items.length > 0) {
            const bookInfo = data.items[0].volumeInfo;
            enrichedData = {
              title: bookInfo.title || null,
              subtitle: bookInfo.subtitle || null,
              authors: bookInfo.authors || null,
              publisher: bookInfo.publisher || null,
              publicationYear: bookInfo.publishedDate
                ? parseInt(bookInfo.publishedDate.split("-")[0])
                : null,
              pages: bookInfo.pageCount || null,
              language: bookInfo.language || null,
              description: bookInfo.description || null,
              categories: bookInfo.categories || null,
              thumbnail: bookInfo.imageLinks?.thumbnail || null,
              isbn: isbn,
              source: "Google Books",
            };
          }
        }
      } catch (error) {
        console.error("Erro ao consultar Google Books:", error);
      }
    }

    // 2. Fallback: Tentar por título na Open Library
    if (!enrichedData && title) {
      try {
        const query = author
          ? `title:${encodeURIComponent(title)} author:${encodeURIComponent(author)}`
          : `title:${encodeURIComponent(title)}`;

        const openLibResponse = await fetch(
          `https://openlibrary.org/search.json?q=${query}&limit=1`,
        );

        if (openLibResponse.ok) {
          const data = await openLibResponse.json();
          if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            enrichedData = {
              title: doc.title || null,
              subtitle: doc.subtitle || null,
              authors: doc.author_name || null,
              publisher: doc.publisher ? doc.publisher[0] : null,
              publicationYear: doc.first_publish_year || null,
              pages: doc.number_of_pages_median || null,
              language: doc.language ? doc.language[0] : null,
              isbn: doc.isbn ? doc.isbn[0] : null,
              source: "Open Library",
            };
          }
        }
      } catch (error) {
        console.error("Erro ao consultar Open Library:", error);
      }
    }

    // 3. Se nenhuma fonte retornou dados, retornar resposta vazia
    if (!enrichedData) {
      return NextResponse.json(
        {
          enrichedData: null,
          message: "Nenhum dado encontrado nas fontes externas",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ enrichedData }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erro ao enriquecer dados:", error);
    return NextResponse.json(
      { error: "Erro ao enriquecer dados do livro" },
      { status: 500 },
    );
  }
}
