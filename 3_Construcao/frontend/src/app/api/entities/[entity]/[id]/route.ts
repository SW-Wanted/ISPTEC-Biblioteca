import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import {
  BookStatus,
  ComputerStatus,
  FineStatus,
  FineType,
  LoanStatus,
  LockerStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
  ReservationStatus,
  UserStatus,
  UserType,
} from "@prisma/client"
import { FINE_PER_DAY_KZ, normalizeEnum } from "@/lib/sgbu-rules"

const jsonObjectSchema = z.record(z.string(), z.unknown())
const statusSchema = z.object({ status: z.string() })

const bookPatchSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().nullable().optional(),
    isbn: z.string().nullable().optional(),
    edition: z.string().nullable().optional(),
    publication_year: z.number().int().nullable().optional(),
    language: z.string().optional(),
    pages: z.number().int().nullable().optional(),
    description: z.string().nullable().optional(),
    cover_url: z.string().nullable().optional(),
    category: z.string().optional(),
    publisher: z.string().nullable().optional(),
    location: z.string().optional(),
  })
  .partial()

const memberPatchSchema = z
  .object({
    status: z.string().optional(),
    role: z.string().optional(),
    notification_preferences: z
      .object({
        preferred: z.string().optional(),
      })
      .optional(),
  })
  .partial()

const finePatchSchema = z
  .object({
    status: z.string().optional(),
    payment_method: z.string().nullable().optional(),
    payment_reference: z.string().nullable().optional(),
    waived_by: z.string().nullable().optional(),
    waiver_reason: z.string().nullable().optional(),
  })
  .partial()

function isEnumValue<T extends Record<string, string>>(enumObj: T, value: unknown): value is T[keyof T] {
  if (typeof value !== "string") return false
  return Object.values(enumObj).includes(value as T[keyof T])
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
    select: { id: true, email: true, name: true, type: true, status: true, isBlocked: true },
  })
  if (!user) return null
  if (user.status !== UserStatus.ACTIVE || user.isBlocked) return null

  return user
}

async function notifyNextReservation(tx: Prisma.TransactionClient, bookId: string) {
  const nextReservation = await tx.reservation.findFirst({
    where: { bookId, status: ReservationStatus.ACTIVE },
    orderBy: { queuePosition: "asc" },
    select: { id: true, userId: true },
  })

  if (!nextReservation) return

  const availableCopy = await tx.copy.findFirst({
    where: { bookId, status: BookStatus.AVAILABLE },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  if (!availableCopy) return

  const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await tx.reservation.update({
    where: { id: nextReservation.id },
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
      userId: nextReservation.userId,
      type: NotificationType.IN_APP,
      status: NotificationStatus.PENDING,
      title: "Livro disponível!",
      message: "O livro reservado ficou disponível. Tens 48h para levantar.",
      reservationId: nextReservation.id,
    },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const bodyUnknown: unknown = await request.json().catch(() => null)
  if (!bodyUnknown || typeof bodyUnknown !== "object" || Array.isArray(bodyUnknown)) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }
  const body = jsonObjectSchema.parse(bodyUnknown)

  if (entity === "Book") {
    if (!canManageBooks(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const parsed = bookPatchSchema.parse(body)
    const data: Prisma.BookUpdateInput = {}
    if (typeof parsed.title === "string") data.title = parsed.title
    if (parsed.subtitle !== undefined) data.subtitle = parsed.subtitle
    if (parsed.isbn !== undefined) data.isbn = parsed.isbn
    if (parsed.edition !== undefined) data.edition = parsed.edition
    if (parsed.publication_year !== undefined) data.publicationYear = parsed.publication_year
    if (typeof parsed.language === "string") data.language = parsed.language
    if (parsed.pages !== undefined) data.pages = parsed.pages
    if (parsed.description !== undefined) data.description = parsed.description
    if (parsed.cover_url !== undefined) data.coverUrl = parsed.cover_url

    if (typeof parsed.category === "string" && parsed.category.trim()) {
      const category = await prisma.category.upsert({
        where: { name: parsed.category.trim() },
        update: {},
        create: { name: parsed.category.trim() },
      })
      data.category = { connect: { id: category.id } }
    }

    if (parsed.publisher !== undefined) {
      const name = typeof parsed.publisher === "string" ? parsed.publisher.trim() : ""
      if (name) {
        const publisher = await prisma.publisher.upsert({ where: { name }, update: {}, create: { name } })
        data.publisher = { connect: { id: publisher.id } }
      } else {
        data.publisher = { disconnect: true }
      }
    }

    // copies update (location + counts)
    if (typeof parsed.location === "string") {
      const loc = parsed.location.trim() || "N/A"
      await prisma.copy.updateMany({ where: { bookId: id }, data: { location: loc } })
    }

    await prisma.book.update({ where: { id }, data })

    return NextResponse.json({ ok: true })
  }

  if (entity === "Loan") {
    if (!canManageLoans(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const statusParsed = statusSchema.safeParse(body)
    if (!statusParsed.success) return NextResponse.json({ error: "status é obrigatório" }, { status: 400 })
    const nextStatus = normalizeEnum(statusParsed.data.status)

    if (nextStatus === "RETURNED") {
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.findUnique({
          where: { id },
          include: { copy: { select: { id: true, bookId: true } }, user: { select: { id: true, type: true } } },
        })
        if (!loan) throw new Error("NOT_FOUND")

        const isOverdue = loan.dueDate.getTime() < now.getTime()
        const daysOverdue = isOverdue
          ? Math.max(0, Math.floor((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0
        const fineAmount = daysOverdue * FINE_PER_DAY_KZ

        await tx.loan.update({
          where: { id: loan.id },
          data: {
            status: LoanStatus.RETURNED,
            returnDate: now,
            daysOverdue,
            fineAmount,
          },
        })

        // free copy (or hold for reservations)
        await tx.copy.update({
          where: { id: loan.copyId },
          data: { status: BookStatus.AVAILABLE },
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

          const sum = await tx.fine.aggregate({
            where: { userId: loan.userId, status: FineStatus.PENDING },
            _sum: { amount: true },
          })
          await tx.user.update({ where: { id: loan.userId }, data: { totalFines: sum._sum.amount ?? 0 } })
        }

        // notify next reservation (and hold an available copy)
        await notifyNextReservation(tx, loan.copy.bookId)

        // update book counters
        const availableCopies = await tx.copy.count({ where: { bookId: loan.copy.bookId, status: BookStatus.AVAILABLE } })
        const totalCopies = await tx.copy.count({ where: { bookId: loan.copy.bookId } })
        await tx.book.update({ where: { id: loan.copy.bookId }, data: { availableCopies, totalCopies } })
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Reservation") {
    const statusParsed = statusSchema.safeParse(body)
    if (!statusParsed.success) return NextResponse.json({ error: "status é obrigatório" }, { status: 400 })
    const status = normalizeEnum(statusParsed.data.status)

    if (status === ReservationStatus.CANCELLED) {
      await prisma.$transaction(async (tx) => {
        const res = await tx.reservation.findUnique({ where: { id }, select: { id: true, bookId: true, queuePosition: true, status: true } })
        if (!res) throw new Error("NOT_FOUND")

        await tx.reservation.update({ where: { id }, data: { status: ReservationStatus.CANCELLED } })

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
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Notification") {
    // user can only update own notification
    const notif = await prisma.notification.findUnique({ where: { id }, select: { userId: true } })
    if (!notif || notif.userId !== user.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const statusParsed = statusSchema.safeParse(body)
    if (!statusParsed.success) return NextResponse.json({ error: "status é obrigatório" }, { status: 400 })
    const status = normalizeEnum(statusParsed.data.status)
    if (status === NotificationStatus.READ) {
      await prisma.notification.update({ where: { id }, data: { status: NotificationStatus.READ, readAt: new Date() } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Locker") {
    const statusParsed = statusSchema.safeParse(body)
    if (!statusParsed.success) return NextResponse.json({ error: "status é obrigatório" }, { status: 400 })
    const status = normalizeEnum(statusParsed.data.status)
    if (status === LockerStatus.OCCUPIED) {
      await prisma.$transaction(async (tx) => {
        const locker = await tx.locker.findUnique({ where: { id }, select: { id: true, status: true } })
        if (!locker) throw new Error("NOT_FOUND")
        if (locker.status !== "AVAILABLE") throw new Error("NOT_AVAILABLE")

        const expectedEnd = new Date(Date.now() + 3 * 60 * 60 * 1000)
        await tx.lockerRental.create({
          data: {
            lockerId: locker.id,
            userId: user.id,
            expectedEnd,
          },
        })

        await tx.locker.update({ where: { id: locker.id }, data: { status: LockerStatus.OCCUPIED } })

        await tx.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.IN_APP,
            status: NotificationStatus.PENDING,
            title: "Cacifo reservado!",
            message: `Cacifo reservado por 3 horas. Libere até ${expectedEnd.toISOString()}.`,
          },
        })
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Computer") {
    const statusParsed = statusSchema.safeParse(body)
    if (!statusParsed.success) return NextResponse.json({ error: "status é obrigatório" }, { status: 400 })
    const status = normalizeEnum(statusParsed.data.status)
    if (status === ComputerStatus.OCCUPIED) {
      await prisma.$transaction(async (tx) => {
        const computer = await tx.computer.findUnique({ where: { id }, select: { id: true, status: true, location: true, number: true } })
        if (!computer) throw new Error("NOT_FOUND")
        if (computer.status !== "AVAILABLE") throw new Error("NOT_AVAILABLE")

        const expectedEnd = new Date(Date.now() + 2 * 60 * 60 * 1000)
        await tx.computerSession.create({
          data: {
            computerId: computer.id,
            userId: user.id,
            expectedEnd,
          },
        })

        await tx.computer.update({ where: { id: computer.id }, data: { status: ComputerStatus.OCCUPIED } })

        await tx.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.IN_APP,
            status: NotificationStatus.PENDING,
            title: "Computador reservado!",
            message: `Computador ${computer.number} no ${computer.location} reservado por 2 horas.`,
          },
        })
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Member") {
    if (!canManageMembers(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const parsed = memberPatchSchema.parse(body)
    const data: Prisma.UserUpdateInput = {}
    if (typeof parsed.status === "string") {
      const s = normalizeEnum(parsed.status)
      if (isEnumValue(UserStatus, s)) data.status = s
    }
    if (typeof parsed.role === "string") {
      const r = normalizeEnum(parsed.role)
      if (isEnumValue(UserType, r)) data.type = r
    }
    if (parsed.notification_preferences?.preferred) {
      const p = normalizeEnum(parsed.notification_preferences.preferred)
      if (isEnumValue(NotificationType, p)) data.preferredNotification = p
    }

    await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  }

  if (entity === "Fine") {
    if (!canManageMembers(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const parsed = finePatchSchema.parse(body)
    const status = typeof parsed.status === "string" ? normalizeEnum(parsed.status) : ""
    if (status === FineStatus.PAID) {
      await prisma.$transaction(async (tx) => {
        const fine = await tx.fine.findUnique({ where: { id }, select: { id: true, userId: true, status: true } })
        if (!fine) throw new Error("NOT_FOUND")

        await tx.fine.update({
          where: { id },
          data: {
            status: FineStatus.PAID,
            paidAt: new Date(),
            paymentMethod: typeof parsed.payment_method === "string" ? parsed.payment_method : null,
            paymentReference: typeof parsed.payment_reference === "string" ? parsed.payment_reference : null,
          },
        })

        const sum = await tx.fine.aggregate({ where: { userId: fine.userId, status: FineStatus.PENDING }, _sum: { amount: true } })
        await tx.user.update({ where: { id: fine.userId }, data: { totalFines: sum._sum.amount ?? 0 } })
      })

      return NextResponse.json({ ok: true })
    }

    if (status === FineStatus.WAIVED) {
      await prisma.$transaction(async (tx) => {
        const fine = await tx.fine.findUnique({ where: { id }, select: { id: true, userId: true } })
        if (!fine) throw new Error("NOT_FOUND")

        await tx.fine.update({
          where: { id },
          data: {
            status: FineStatus.WAIVED,
            waivedAt: new Date(),
            waivedBy: typeof parsed.waived_by === "string" ? parsed.waived_by : null,
            waiverReason: typeof parsed.waiver_reason === "string" ? parsed.waiver_reason : null,
          },
        })

        const sum = await tx.fine.aggregate({ where: { userId: fine.userId, status: FineStatus.PENDING }, _sum: { amount: true } })
        await tx.user.update({ where: { id: fine.userId }, data: { totalFines: sum._sum.amount ?? 0 } })
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  return NextResponse.json({ error: "Entidade não suportada" }, { status: 404 })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  if (entity === "Book") {
    if (!canManageBooks(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const hasLoans = await prisma.loan.count({ where: { copy: { bookId: id } } })
    if (hasLoans > 0) {
      return NextResponse.json({ error: "Livro possui empréstimos associados" }, { status: 409 })
    }

    await prisma.book.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  if (entity === "Notification") {
    const notif = await prisma.notification.findUnique({ where: { id }, select: { userId: true } })
    if (!notif || notif.userId !== user.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    await prisma.notification.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Entidade não suportada" }, { status: 404 })
}
