import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import {
  BookStatus,
  FineStatus,
  FineType,
  LoanStatus,
  NotificationStatus,
  NotificationType,
  ReservationStatus,
  UserStatus,
  UserType,
} from "@prisma/client"
import { clampInt, FINE_PER_DAY_KZ, LOAN_LIMITS, normalizeEnum, toIso } from "@/lib/sgbu-rules"

const filterSchema = z.record(z.string(), z.unknown()).optional()

function lowerEnum(value: string): string {
  return value.toLowerCase()
}

function canManageBooks(type: UserType) {
  return type === UserType.SUPERVISOR || type === UserType.LIBRARIAN || type === UserType.CATALOGER
}

function canManageLoans(type: UserType) {
  return type === UserType.SUPERVISOR || type === UserType.LIBRARIAN
}

function canManageMembers(type: UserType) {
  return type === UserType.SUPERVISOR || type === UserType.LIBRARIAN || type === UserType.STAFF
}

async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, type: true, status: true, isBlocked: true, totalFines: true },
  })
  if (!user) return null
  if (user.status !== UserStatus.ACTIVE || user.isBlocked) return null

  return user
}

async function syncOverdueLoansAndFines(userId?: string) {
  const now = new Date()

  const overdueLoans = await prisma.loan.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      dueDate: { lt: now },
      returnDate: null,
    },
    select: { id: true, userId: true, dueDate: true, status: true, fineAmount: true, daysOverdue: true },
  })

  if (overdueLoans.length === 0) return

  await prisma.$transaction(async (tx) => {
    for (const loan of overdueLoans) {
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      )
      const fineAmount = daysOverdue * FINE_PER_DAY_KZ

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.OVERDUE,
          daysOverdue,
          fineAmount: fineAmount,
        },
      })

      if (fineAmount > 0) {
        const existingFine = await tx.fine.findFirst({
          where: { loanId: loan.id, type: FineType.LATE_RETURN, status: FineStatus.PENDING },
          select: { id: true },
        })

        if (!existingFine) {
          await tx.fine.create({
            data: {
              userId: loan.userId,
              loanId: loan.id,
              type: FineType.LATE_RETURN,
              amount: fineAmount,
              status: FineStatus.PENDING,
              reason: `Atraso de ${daysOverdue} dia(s) na devolução`,
            },
          })
        }
      }
    }

    if (userId) {
      const sum = await tx.fine.aggregate({
        where: { userId, status: FineStatus.PENDING },
        _sum: { amount: true },
      })
      await tx.user.update({
        where: { id: userId },
        data: { totalFines: sum._sum.amount ?? 0 },
      })
    }
  })
}

async function expireReservationsIfNeeded(bookId?: string) {
  const now = new Date()

  const expired = await prisma.reservation.findMany({
    where: {
      ...(bookId ? { bookId } : {}),
      status: ReservationStatus.AVAILABLE,
      expiryDate: { lt: now },
    },
    select: { id: true, bookId: true },
  })

  if (expired.length === 0) return

  await prisma.$transaction(async (tx) => {
    for (const res of expired) {
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.EXPIRED },
      })

      // shift queue positions for remaining actives
      const actives = await tx.reservation.findMany({
        where: { bookId: res.bookId, status: ReservationStatus.ACTIVE },
        orderBy: { queuePosition: "asc" },
        select: { id: true },
      })

      let pos = 1
      for (const a of actives) {
        await tx.reservation.update({ where: { id: a.id }, data: { queuePosition: pos } })
        pos++
      }

      // Try to notify next in queue if a copy is available
      const availableCopy = await tx.copy.findFirst({
        where: { bookId: res.bookId, status: BookStatus.AVAILABLE },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })

      if (availableCopy) {
        const next = await tx.reservation.findFirst({
          where: { bookId: res.bookId, status: ReservationStatus.ACTIVE },
          orderBy: { queuePosition: "asc" },
          select: { id: true, userId: true },
        })

        if (next) {
          const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
          await tx.reservation.update({
            where: { id: next.id },
            data: {
              status: ReservationStatus.AVAILABLE,
              availableDate: new Date(),
              expiryDate,
              notifiedAt: new Date(),
            },
          })

          await tx.copy.update({ where: { id: availableCopy.id }, data: { status: BookStatus.RESERVED } })

          await tx.notification.create({
            data: {
              userId: next.userId,
              type: NotificationType.IN_APP,
              status: NotificationStatus.PENDING,
              title: "Livro disponível!",
              message: "O livro reservado ficou disponível. Tens 48h para levantar.",
              reservationId: next.id,
            },
          })
        }
      }

      // Keep book counters consistent
      const counts = await tx.copy.groupBy({
        by: ["status"],
        where: { bookId: res.bookId },
        _count: { _all: true },
      })
      const totalCopies = counts.reduce((acc, c) => acc + c._count._all, 0)
      const availableCopies = counts
        .filter((c) => c.status === BookStatus.AVAILABLE)
        .reduce((acc, c) => acc + c._count._all, 0)

      await tx.book.update({ where: { id: res.bookId }, data: { totalCopies, availableCopies } })
    }
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get("sort") ?? undefined
  const take = searchParams.get("take") ?? undefined
  const filterRaw = searchParams.get("filter")

  const limit = typeof take === "string" ? clampInt(take, 1, 500) : 200

  const filter = filterRaw ? filterSchema.parse(JSON.parse(filterRaw)) : undefined

  if (entity === "Category") {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(
      categories.map((c) => ({ id: c.id, name: c.name, created_date: toIso(c.createdAt), updated_date: toIso(c.updatedAt) }))
    )
  }

  if (entity === "Book") {
    if (!canManageBooks(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const where = filter?.id ? { id: String(filter.id) } : undefined

    const orderBy = sort === "-created_date" ? { createdAt: "desc" as const } : { createdAt: "desc" as const }

    const books = await prisma.book.findMany({
      where,
      include: {
        category: { select: { name: true } },
        publisher: { select: { name: true } },
        authors: { include: { author: { select: { name: true } } }, orderBy: { order: "asc" } },
        copies: { select: { location: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy,
      take: limit,
    })

    return NextResponse.json(
      books.map((b) => ({
        id: b.id,
        created_date: toIso(b.createdAt),
        updated_date: toIso(b.updatedAt),
        title: b.title,
        subtitle: b.subtitle,
        isbn: b.isbn,
        edition: b.edition,
        publication_year: b.publicationYear,
        language: b.language,
        pages: b.pages,
        description: b.description,
        cover_url: b.coverUrl,
        category: b.category?.name ?? null,
        publisher: b.publisher?.name ?? null,
        authors: b.authors.map((a) => a.author.name),
        total_copies: b.totalCopies,
        available_copies: b.availableCopies,
        location: b.copies[0]?.location ?? null,
        extracted_by_ocr: b.extractedByOCR,
        ocr_confidence: b.ocrConfidence ? Number(b.ocrConfidence) : null,
        average_rating: null,
        total_loans: null,
      }))
    )
  }

  if (entity === "Member") {
    if (!canManageMembers(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const where = filter?.user_id ? { email: String(filter.user_id) } : undefined

    const members = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        type: true,
        preferredNotification: true,
        totalFines: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        user_id: m.email,
        full_name: m.name,
        status: lowerEnum(m.status),
        role: lowerEnum(m.type),
        total_fines: Number(m.totalFines),
        notification_preferences: { preferred: lowerEnum(m.preferredNotification) },
        created_date: toIso(m.createdAt),
        updated_date: toIso(m.updatedAt),
      }))
    )
  }

  if (entity === "Loan") {
    if (!canManageLoans(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    await syncOverdueLoansAndFines()

    const where: any = {}
    if (filter?.member_id) where.user = { email: String(filter.member_id) }
    if (filter?.status) where.status = normalizeEnum(filter.status) as any

    const orderBy = sort === "-loan_date" ? { loanDate: "desc" as const } : { loanDate: "desc" as const }

    const loans = await prisma.loan.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        user: { select: { email: true, name: true, type: true } },
        copy: { include: { book: { select: { id: true, title: true } } } },
      },
    })

    return NextResponse.json(
      loans.map((l) => ({
        id: l.id,
        status: lowerEnum(l.status),
        loan_date: toIso(l.loanDate),
        due_date: toIso(l.dueDate),
        return_date: toIso(l.returnDate) ?? null,
        member_id: l.user.email,
        member_name: l.user.name,
        book_id: l.copy.book.id,
        book_title: l.copy.book.title,
        copy_id: l.copyId,
        renewal_count: l.renewalCount,
        max_renewals: l.maxRenewals,
        days_overdue: l.daysOverdue,
        fine_amount: Number(l.fineAmount),
        created_date: toIso(l.createdAt),
        updated_date: toIso(l.updatedAt),
      }))
    )
  }

  if (entity === "Reservation") {
    await expireReservationsIfNeeded()

    const where: any = {}
    if (filter?.member_id) where.user = { email: String(filter.member_id) }
    if (filter?.book_id) where.bookId = String(filter.book_id)
    if (filter?.status) where.status = normalizeEnum(filter.status) as any

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ reservationDate: "desc" }, { queuePosition: "asc" }],
      take: limit,
      include: {
        user: { select: { email: true } },
        book: { select: { title: true } },
      },
    })

    return NextResponse.json(
      reservations.map((r) => ({
        id: r.id,
        status: lowerEnum(r.status),
        member_id: r.user.email,
        book_id: r.bookId,
        book_title: r.book.title,
        reservation_date: toIso(r.reservationDate),
        queue_position: r.queuePosition,
        available_date: toIso(r.availableDate) ?? null,
        expiry_date: toIso(r.expiryDate) ?? null,
        created_date: toIso(r.createdAt),
        updated_date: toIso(r.updatedAt),
      }))
    )
  }

  if (entity === "Fine") {
    if (!canManageMembers(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const where: any = {}
    if (filter?.member_id) where.user = { email: String(filter.member_id) }
    if (filter?.status) where.status = normalizeEnum(filter.status) as any

    const fines = await prisma.fine.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: { user: { select: { email: true, name: true } }, loan: { select: { id: true } } },
    })

    return NextResponse.json(
      fines.map((f) => ({
        id: f.id,
        status: lowerEnum(f.status),
        member_id: f.user.email,
        member_name: f.user.name,
        loan_id: f.loanId ?? null,
        type: lowerEnum(f.type),
        amount: Number(f.amount),
        reason: f.reason ?? null,
        generated_at: toIso(f.generatedAt),
        paid_at: toIso(f.paidAt) ?? null,
        created_date: toIso(f.createdAt),
        updated_date: toIso(f.updatedAt),
      }))
    )
  }

  if (entity === "Notification") {
    const where: any = {}
    if (filter?.user_id) where.user = { email: String(filter.user_id) }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { email: true } } },
    })

    return NextResponse.json(
      notifications.map((n) => ({
        id: n.id,
        user_id: n.user.email,
        title: n.title,
        message: n.message,
        status: lowerEnum(n.status),
        type: lowerEnum(n.type),
        read_at: toIso(n.readAt) ?? null,
        created_date: toIso(n.createdAt),
        updated_date: toIso(n.updatedAt),
      }))
    )
  }

  if (entity === "Locker") {
    const lockers = await prisma.locker.findMany({
      orderBy: { number: "asc" },
      take: limit,
      select: { id: true, number: true, location: true, status: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(
      lockers.map((l) => ({
        id: l.id,
        number: l.number,
        location: l.location,
        status: lowerEnum(l.status),
        created_date: toIso(l.createdAt),
        updated_date: toIso(l.updatedAt),
      }))
    )
  }

  if (entity === "Computer") {
    const computers = await prisma.computer.findMany({
      orderBy: [{ location: "asc" }, { number: "asc" }],
      take: limit,
      select: { id: true, number: true, location: true, status: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(
      computers.map((c) => ({
        id: c.id,
        number: c.number,
        location: c.location,
        status: lowerEnum(c.status),
        created_date: toIso(c.createdAt),
        updated_date: toIso(c.updatedAt),
      }))
    )
  }

  if (entity === "SpecialRequest") {
    const where: any = {}
    if (filter?.user_id) where.user = { email: String(filter.user_id) }
    if (filter?.status) where.status = normalizeEnum(filter.status) as any

    const requests = await prisma.specialRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: limit,
      include: { user: { select: { email: true, name: true } } },
    })

    return NextResponse.json(
      requests.map((r) => ({
        id: r.id,
        user_id: r.user.email,
        user_name: r.user.name,
        type: lowerEnum(r.type),
        title: r.title,
        description: r.description,
        status: lowerEnum(r.status),
        requested_at: toIso(r.requestedAt),
        scheduled_date: toIso(r.scheduledDate) ?? null,
        response: r.response ?? null,
        created_date: toIso(r.createdAt),
        updated_date: toIso(r.updatedAt),
      }))
    )
  }

  return NextResponse.json({ error: "Entidade não suportada" }, { status: 404 })
}

export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  if (entity === "Book") {
    if (!canManageBooks(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const title = typeof (body as any).title === "string" ? (body as any).title.trim() : ""
    if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })

    const isbn = typeof (body as any).isbn === "string" ? (body as any).isbn.trim() : null
    const categoryName = typeof (body as any).category === "string" ? (body as any).category.trim() : ""
    if (!categoryName) return NextResponse.json({ error: "Categoria é obrigatória" }, { status: 400 })

    const publisherName = typeof (body as any).publisher === "string" ? (body as any).publisher.trim() : null

    const authors = Array.isArray((body as any).authors)
      ? (body as any).authors.map((a: any) => String(a).trim()).filter(Boolean)
      : []

    const totalCopies = clampInt((body as any).total_copies ?? 1, 1, 500)
    const availableCopies = clampInt((body as any).available_copies ?? totalCopies, 0, totalCopies)
    const location = typeof (body as any).location === "string" ? (body as any).location.trim() : ""

    const created = await prisma.$transaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      })

      const publisher = publisherName
        ? await tx.publisher.upsert({ where: { name: publisherName }, update: {}, create: { name: publisherName } })
        : null

      const book = await tx.book.create({
        data: {
          title,
          subtitle: (body as any).subtitle ?? null,
          isbn,
          edition: (body as any).edition ?? null,
          publicationYear: (body as any).publication_year ?? null,
          language: (body as any).language ?? "pt",
          pages: (body as any).pages ?? null,
          description: (body as any).description ?? null,
          coverUrl: (body as any).cover_url ?? null,
          categoryId: category.id,
          publisherId: publisher?.id ?? null,
          keywords: [],
          totalCopies,
          availableCopies: availableCopies,
          extractedByOCR: false,
        },
      })

      if (authors.length > 0) {
        for (let i = 0; i < authors.length; i++) {
          const name = authors[i]
          const existingAuthor = await tx.author.findFirst({ where: { name }, select: { id: true } })
          const author =
            existingAuthor ?? (await tx.author.create({ data: { name }, select: { id: true } }))
          await tx.bookAuthor.create({ data: { bookId: book.id, authorId: author.id, order: i + 1 } })
        }
      }

      const copiesToCreate = totalCopies
      for (let i = 0; i < copiesToCreate; i++) {
        const barcode = `AUTO-${book.id.slice(-6)}-${Date.now().toString(16)}-${i + 1}`
        await tx.copy.create({
          data: {
            bookId: book.id,
            barcode,
            status: i < availableCopies ? BookStatus.AVAILABLE : BookStatus.MAINTENANCE,
            location: location || "N/A",
          },
        })
      }

      return book
    })

    return NextResponse.json({ id: created.id })
  }

  if (entity === "Reservation") {
    // Any authenticated user can reserve
    const bookId = typeof (body as any).book_id === "string" ? (body as any).book_id : null
    if (!bookId) return NextResponse.json({ error: "book_id é obrigatório" }, { status: 400 })

    await expireReservationsIfNeeded(bookId)

    const created = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.reservation.count({
        where: { bookId, status: ReservationStatus.ACTIVE },
      })

      const res = await tx.reservation.create({
        data: {
          bookId,
          userId: user.id,
          status: ReservationStatus.ACTIVE,
          queuePosition: activeCount + 1,
        },
      })

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Reserva registada",
          message: `A sua reserva foi registada. Posição na fila: ${activeCount + 1}.`,
          reservationId: res.id,
        },
      })

      return res
    })

    return NextResponse.json({ id: created.id })
  }

  if (entity === "Notification") {
    const targetEmail = typeof (body as any).user_id === "string" ? (body as any).user_id.trim() : user.email

    // Only admins can create notification for other users
    if (targetEmail !== user.email && !canManageMembers(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const target = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } })
    if (!target) return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 })

    const title = typeof (body as any).title === "string" ? (body as any).title.trim() : ""
    const message = typeof (body as any).message === "string" ? (body as any).message : ""
    if (!title || !message) return NextResponse.json({ error: "title e message são obrigatórios" }, { status: 400 })

    const created = await prisma.notification.create({
      data: {
        userId: target.id,
        type: NotificationType.IN_APP,
        status: NotificationStatus.PENDING,
        title,
        message,
      },
      select: { id: true },
    })

    return NextResponse.json({ id: created.id })
  }

  if (entity === "SpecialRequest") {
    const type = typeof (body as any).type === "string" ? (body as any).type.trim().toUpperCase() : ""
    const title = typeof (body as any).title === "string" ? (body as any).title.trim() : ""
    const description = typeof (body as any).description === "string" ? (body as any).description : ""
    if (!type || !title || !description) {
      return NextResponse.json({ error: "type, title e description são obrigatórios" }, { status: 400 })
    }

    const scheduledDateRaw = (body as any).scheduled_date
    const scheduledDate = scheduledDateRaw ? new Date(String(scheduledDateRaw)) : null

    const created = await prisma.specialRequest.create({
      data: {
        userId: user.id,
        type,
        title,
        description,
        scheduledDate,
      },
      select: { id: true },
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.IN_APP,
        status: NotificationStatus.PENDING,
        title: "Solicitação enviada",
        message: `A sua solicitação (${type}) foi recebida e está em análise.`,
      },
    })

    return NextResponse.json({ id: created.id })
  }

  if (entity === "Loan") {
    if (!canManageLoans(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const memberId = typeof (body as any).member_id === "string" ? (body as any).member_id.trim() : ""
    const bookId = typeof (body as any).book_id === "string" ? (body as any).book_id.trim() : ""

    if (!memberId || !bookId) {
      return NextResponse.json({ error: "member_id e book_id são obrigatórios" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.user.findUnique({
        where: { email: memberId },
        select: { id: true, type: true, status: true, isBlocked: true, totalFines: true },
      })
      if (!member || member.status !== UserStatus.ACTIVE || member.isBlocked) {
        throw new Error("MEMBER_INVALID")
      }
      if (Number(member.totalFines) > 0) {
        throw new Error("MEMBER_HAS_FINES")
      }

      const activeLoans = await tx.loan.count({
        where: { userId: member.id, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      })
      const limits = LOAN_LIMITS[member.type]
      if (activeLoans >= limits.maxBooks) {
        throw new Error("LOAN_LIMIT")
      }

      await expireReservationsIfNeeded(bookId)

      const hasOtherReservations = await tx.reservation.findFirst({
        where: {
          bookId,
          status: ReservationStatus.ACTIVE,
          NOT: { userId: member.id },
        },
        select: { id: true },
      })
      if (hasOtherReservations) {
        throw new Error("HAS_RESERVATIONS")
      }

      const copy = await tx.copy.findFirst({
        where: { bookId, status: BookStatus.AVAILABLE },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
      if (!copy) {
        throw new Error("NO_COPY")
      }

      const dueDate = new Date(Date.now() + limits.loanDays * 24 * 60 * 60 * 1000)

      const loan = await tx.loan.create({
        data: {
          userId: member.id,
          copyId: copy.id,
          dueDate,
          status: LoanStatus.ACTIVE,
        },
      })

      await tx.copy.update({ where: { id: copy.id }, data: { status: BookStatus.BORROWED } })

      const availableCopies = await tx.copy.count({ where: { bookId, status: BookStatus.AVAILABLE } })
      const totalCopies = await tx.copy.count({ where: { bookId } })
      await tx.book.update({ where: { id: bookId }, data: { availableCopies, totalCopies } })

      await tx.notification.create({
        data: {
          userId: member.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Empréstimo registado",
          message: `O seu empréstimo foi registado. Data de devolução: ${dueDate.toISOString()}.`,
          loanId: loan.id,
        },
      })

      return loan
    })

    return NextResponse.json({ id: result.id })
  }

  return NextResponse.json({ error: "Entidade não suportada" }, { status: 404 })
}
