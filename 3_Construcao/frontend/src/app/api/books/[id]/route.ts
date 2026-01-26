import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

function toIso(value: Date | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toISOString()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        publisher: { select: { name: true } },
        authors: { include: { author: { select: { name: true } } }, orderBy: { order: "asc" } },
        copies: {
          select: {
            id: true,
            barcode: true,
            status: true,
            location: true,
          },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            review: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: "Livro não encontrado" }, { status: 404 })
    }

    const mapped = {
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

      copies: book.copies.map((c) => ({
        id: c.id,
        book_id: book.id,
        barcode: c.barcode,
        status: c.status,
        location: c.location,
      })),

      reviews: book.reviews.map((r) => ({
        id: r.id,
        book_id: book.id,
        rating: r.rating,
        review: r.review,
        user_id: r.user.id,
        user_name: r.user.name,
        created_date: toIso(r.createdAt),
      })),
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error("GET /api/books/[id] error:", error)
    return NextResponse.json({ error: "Falha ao buscar livro" }, { status: 500 })
  }
}
