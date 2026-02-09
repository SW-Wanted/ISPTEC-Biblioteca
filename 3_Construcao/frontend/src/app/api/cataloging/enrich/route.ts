import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/cataloging/enrich
 * Enriquece dados de livro usando Google Books API
 * Busca por ISBN (prioritário) ou título+autor
 */

const enrichSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, publisher } =
      enrichSchema.parse(body);

    // Validar que ao menos ISBN ou título foi fornecido
    if (!isbn && !title) {
      return NextResponse.json(
        { error: "ISBN ou título é obrigatório" },
        { status: 400 },
      );
    }

    console.log("📚 Enriquecendo dados:", { isbn, title, author });

    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";
    let enrichedData = null;

    // Estratégia 1: Buscar por ISBN (mais preciso)
    if (isbn) {
      try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`;
        console.log("🔍 Buscando por ISBN:", isbn);

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const bookInfo = data.items[0].volumeInfo;
          enrichedData = normalizeGoogleBooksData(bookInfo, isbn);
          console.log("✅ Dados encontrados por ISBN");
        }
      } catch (error) {
        console.error("❌ Erro ao buscar por ISBN:", error);
      }
    }

    // Estratégia 2: Buscar por título + autor (fallback)
    if (!enrichedData && title) {
      try {
        // Construir query composta
        let query = `intitle:${encodeURIComponent(title)}`;
        if (author) query += `+inauthor:${encodeURIComponent(author)}`;
        if (publisher) query += `+inpublisher:${encodeURIComponent(publisher)}`;

        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=5`;
        console.log("🔍 Buscando por título:", query);

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          // Pegar o resultado mais relevante (primeiro)
          const bookInfo = data.items[0].volumeInfo as Record<string, unknown>;

          // Tentar extrair ISBN do resultado
          const foundIsbn =
            (bookInfo.industryIdentifiers as Array<{ type: string; identifier: string }> | undefined)?.find(
              (id) => id.type === "ISBN_13",
            )?.identifier ||
            (bookInfo.industryIdentifiers as Array<{ type: string; identifier: string }> | undefined)?.find(
              (id) => id.type === "ISBN_10",
            )?.identifier;

          enrichedData = normalizeGoogleBooksData(bookInfo, foundIsbn || isbn);
          console.log("✅ Dados encontrados por título");
        }
      } catch (error) {
        console.error("❌ Erro ao buscar por título:", error);
      }
    }

    // Se nenhuma fonte retornou dados, retornar resposta vazia
    if (!enrichedData) {
      console.log("⚠️ Nenhum dado encontrado no Google Books");
      return NextResponse.json(
        {
          enrichedData: null,
          message: "Nenhum dado encontrado no Google Books",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ enrichedData }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }

    console.error("❌ Erro ao enriquecer dados:", error);
    return NextResponse.json(
      { error: "Erro ao enriquecer dados do livro" },
      { status: 500 },
    );
  }
}

/**
 * Normaliza dados retornados do Google Books API
 * Combina todos os dados disponíveis e mapeia idioma
 */
function normalizeGoogleBooksData(bookInfo: Record<string, unknown>, isbn?: string) {
  // Helper para acessar propriedades com segurança
  const getStringProp = (key: string): string | undefined => {
    const val = bookInfo[key];
    return typeof val === 'string' ? val : undefined;
  };
  
  const getNumberProp = (key: string): number | undefined => {
    const val = bookInfo[key];
    return typeof val === 'number' ? val : undefined;
  };
  
  const getArrayProp = (key: string): unknown[] | undefined => {
    const val = bookInfo[key];
    return Array.isArray(val) ? val : undefined;
  };
  
  const getObjectProp = (key: string): Record<string, unknown> | undefined => {
    const val = bookInfo[key];
    return val && typeof val === 'object' && !Array.isArray(val) ? val as Record<string, unknown> : undefined;
  };

  // Extrair ISBN (priorizar ISBN-13)
  const bookIsbn =
    isbn ||
    (bookInfo.industryIdentifiers as Array<{ type: string; identifier: string }> | undefined)?.find((id) => id.type === "ISBN_13")
      ?.identifier ||
    (bookInfo.industryIdentifiers as Array<{ type: string; identifier: string }> | undefined)?.find((id) => id.type === "ISBN_10")
      ?.identifier;

  // Extrair ano de publicação
  let publicationYear = null;
  const publishedDate = getStringProp('publishedDate');
  if (publishedDate) {
    const yearMatch = publishedDate.match(/\d{4}/);
    publicationYear = yearMatch ? parseInt(yearMatch[0]) : null;
  }

  // Mapear idioma para código ISO 639-1 (formato do combobox)
  const languageMap: Record<string, string> = {
    pt: "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
    por: "pt",
    en: "en",
    eng: "en",
    "en-US": "en",
    "en-GB": "en",
    es: "es",
    spa: "es",
    fr: "fr",
    fra: "fr",
    de: "de",
    deu: "de",
    it: "it",
    ita: "it",
  };

  const rawLanguage = getStringProp('language')?.toLowerCase();
  const normalizedLanguage = rawLanguage
    ? languageMap[rawLanguage] || rawLanguage.slice(0, 2)
    : "pt";

  // Extrair dimensões do livro (se disponível)
  const dimensions = getObjectProp('dimensions');
  const dimensionsStr = dimensions
    ? `${dimensions.height} x ${dimensions.width} x ${dimensions.thickness}`
    : null;

  // Extrair edição (do título ou campo específico)
  let edition = null;
  const title = getStringProp('title');
  if (title) {
    const editionMatch = title.match(/(\d+)[ªº°]?\s*(ed|edição)/i);
    edition = editionMatch ? editionMatch[1] + "ª" : null;
  }

  // Extrair palavras-chave das categorias
  const categories = getArrayProp('categories');
  const keywords = categories
    ? categories.flatMap((cat) =>
        typeof cat === 'string' ? cat.split("/").map((k) => k.trim()) : []
      )
    : [];

  // Buscar capa de melhor qualidade
  const imageLinks = getObjectProp('imageLinks');
  const coverUrl =
    (imageLinks?.extraLarge as string | undefined) ||
    (imageLinks?.large as string | undefined) ||
    (imageLinks?.medium as string | undefined) ||
    (imageLinks?.thumbnail as string | undefined) ||
    (imageLinks?.smallThumbnail as string | undefined) ||
    null;

  // Limpar descrição HTML
  const description = getStringProp('description');
  const cleanDescription = description
    ? description.replace(/<[^>]*>/g, "").trim()
    : null;

  // Extrair thumbnail
  const thumbnail = imageLinks?.thumbnail;
  const thumbnailUrl = typeof thumbnail === 'string' ? thumbnail : null;

  // Extrair industry identifiers para googleBooksId
  const industryIdentifiers = getArrayProp('industryIdentifiers');
  const firstIdentifier = industryIdentifiers?.[0];
  const googleBooksId = firstIdentifier && typeof firstIdentifier === 'object' && firstIdentifier !== null && 'identifier' in firstIdentifier
    ? (firstIdentifier as { identifier: string }).identifier
    : null;

  return {
    // Dados básicos
    isbn: bookIsbn,
    title: getStringProp('title') || null,
    subtitle: getStringProp('subtitle') || null,
    edition,

    // Autores e editora
    authors: getArrayProp('authors') || null,
    publisher: getStringProp('publisher') || null,

    // Publicação
    publicationYear,
    publishedDate: getStringProp('publishedDate') || null, // Data completa original

    // Características físicas
    pages: getNumberProp('pageCount') || null,
    language: normalizedLanguage,
    dimensions,

    // Conteúdo
    description: cleanDescription,
    categories: getArrayProp('categories') || null,
    keywords: keywords.length > 0 ? keywords : null,

    // Mídia
    coverUrl,
    thumbnail: thumbnailUrl,

    // Classificações
    averageRating: getNumberProp('averageRating') || null,
    ratingsCount: getNumberProp('ratingsCount') || null,
    maturityRating: getStringProp('maturityRating') || null,

    // Metadados Google Books
    googleBooksId,
    previewLink: getStringProp('previewLink') || null,
    infoLink: getStringProp('infoLink') || null,

    // Origem
    source: "Google Books",
  };
}
