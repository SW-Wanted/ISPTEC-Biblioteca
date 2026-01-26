import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

function toIso(value: Date | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toISOString()
}

function mapBook(book: {
  id: string
  title: string
  subtitle: string | null
  isbn: string | null
  edition: string | null
  publicationYear: number | null
  language: string
  pages: number | null
  description: string | null
  coverUrl: string | null
  totalCopies: number
  availableCopies: number
  extractedByOCR: boolean
  ocrConfidence: Prisma.Decimal | null
  category: { name: string }
  publisher: { name: string } | null
  authors: { author: { name: string } }[]
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: book.id,
    created_date: toIso(book.createdAt),
    updated_date: toIso(book.updatedAt),

    title: book.title,
    subtitle: book.subtitle,
    isbn: book.isbn,
    edition: book.edition,
    publication_year: book.publicationYear,
    language: book.language,
    pages: book.pages,
    description: book.description,
    cover_url: book.coverUrl,

    category: book.category?.name ?? null,
    publisher: book.publisher?.name ?? null,
    authors: book.authors?.map((a) => a.author.name) ?? [],

    total_copies: book.totalCopies,
    available_copies: book.availableCopies,

    extracted_by_ocr: book.extractedByOCR,
    ocr_confidence: book.ocrConfidence ? Number(book.ocrConfidence) : null,

    // Ainda não temos contadores agregados eficientes (evitar N+1 nesta fase)
    average_rating: null,
    total_loans: null,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const search = (searchParams.get("search") ?? "").trim()
    const categoryId = searchParams.get("category")
    const sort = (searchParams.get("sort") ?? "new").trim()

    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "12", 10) || 12))

    const where = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { subtitle: { contains: search, mode: "insensitive" as const } },
              { isbn: { contains: search, mode: "insensitive" as const } },
              {
                authors: {
                  some: {
                    author: { name: { contains: search, mode: "insensitive" as const } },
                  },
                },
              },
            ],
          }
        : {}),
      ...(categoryId && categoryId !== "all" ? { categoryId } : {}),
    }

    const orderBy =
      sort === "popular"
        ? [
            { reservations: { _count: "desc" as const } },
            { reviews: { _count: "desc" as const } },
            { createdAt: "desc" as const },
          ]
        : [{ createdAt: "desc" as const }]

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          category: { select: { name: true } },
          publisher: { select: { name: true } },
          authors: { include: { author: { select: { name: true } } }, orderBy: { order: "asc" } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.book.count({ where }),
    ])

    return NextResponse.json({
      books: books.map(mapBook),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/books error:", error)
    return NextResponse.json({ error: "Falha ao buscar livros" }, { status: 500 })
  }
}
