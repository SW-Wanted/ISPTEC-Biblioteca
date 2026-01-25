import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

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
import { FINE_PER_DAY_KZ, LOAN_LIMITS, normalizeEnum } from "@/lib/sgbu-rules"

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

async function notifyNextReservation(tx: any, bookId: string) {
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

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Body inválido" }, { status: 400 })

  if (entity === "Book") {
    if (!canManageBooks(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const data: any = {}
    if (typeof (body as any).title === "string") data.title = (body as any).title
    if (typeof (body as any).subtitle === "string") data.subtitle = (body as any).subtitle
    if (typeof (body as any).isbn === "string") data.isbn = (body as any).isbn
    if (typeof (body as any).edition === "string") data.edition = (body as any).edition
    if (typeof (body as any).publication_year === "number") data.publicationYear = (body as any).publication_year
    if (typeof (body as any).language === "string") data.language = (body as any).language
    if (typeof (body as any).pages === "number") data.pages = (body as any).pages
    if (typeof (body as any).description === "string") data.description = (body as any).description
    if (typeof (body as any).cover_url === "string") data.coverUrl = (body as any).cover_url

    if (typeof (body as any).category === "string" && (body as any).category.trim()) {
      const category = await prisma.category.upsert({
        where: { name: (body as any).category.trim() },
        update: {},
        create: { name: (body as any).category.trim() },
      })
      data.categoryId = category.id
    }

    if (typeof (body as any).publisher === "string") {
      const name = (body as any).publisher.trim()
      if (name) {
        const publisher = await prisma.publisher.upsert({ where: { name }, update: {}, create: { name } })
        data.publisherId = publisher.id
      } else {
        data.publisherId = null
      }
    }

    // copies update (location + counts)
    if (typeof (body as any).location === "string") {
      const loc = (body as any).location.trim() || "N/A"
      await prisma.copy.updateMany({ where: { bookId: id }, data: { location: loc } })
    }

    await prisma.book.update({ where: { id }, data })

    return NextResponse.json({ ok: true })
  }

  if (entity === "Loan") {
    if (!canManageLoans(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const nextStatus = normalizeEnum((body as any).status)

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
    const status = normalizeEnum((body as any).status)

    if (status === "CANCELLED") {
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

    const status = normalizeEnum((body as any).status)
    if (status === "READ") {
      await prisma.notification.update({ where: { id }, data: { status: NotificationStatus.READ, readAt: new Date() } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 })
  }

  if (entity === "Locker") {
    const status = normalizeEnum((body as any).status)
    if (status === "OCCUPIED") {
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

        await tx.locker.update({ where: { id: locker.id }, data: { status: "OCCUPIED" as any } })

        await tx.notification.create({
          data: {
            userId: user.id,
            type: "IN_APP" as any,
            status: "PENDING" as any,
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
    const status = normalizeEnum((body as any).status)
    if (status === "OCCUPIED") {
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

        await tx.computer.update({ where: { id: computer.id }, data: { status: "OCCUPIED" as any } })

        await tx.notification.create({
          data: {
            userId: user.id,
            type: "IN_APP" as any,
            status: "PENDING" as any,
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

    const data: any = {}
    if (typeof (body as any).status === "string") {
      const s = normalizeEnum((body as any).status)
      if (s) data.status = s
    }
    if (typeof (body as any).role === "string") {
      const r = normalizeEnum((body as any).role)
      if (r && r in UserType) data.type = r
    }
    if ((body as any).notification_preferences?.preferred) {
      const p = normalizeEnum((body as any).notification_preferences.preferred)
      if (p && p in NotificationType) data.preferredNotification = p
    }

    await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  }

  if (entity === "Fine") {
    if (!canManageMembers(user.type)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 })

    const status = normalizeEnum((body as any).status)
    if (status === "PAID") {
      await prisma.$transaction(async (tx) => {
        const fine = await tx.fine.findUnique({ where: { id }, select: { id: true, userId: true, status: true } })
        if (!fine) throw new Error("NOT_FOUND")

        await tx.fine.update({
          where: { id },
          data: {
            status: FineStatus.PAID,
            paidAt: new Date(),
            paymentMethod: typeof (body as any).payment_method === "string" ? (body as any).payment_method : null,
            paymentReference:
              typeof (body as any).payment_reference === "string" ? (body as any).payment_reference : null,
          },
        })

        const sum = await tx.fine.aggregate({ where: { userId: fine.userId, status: FineStatus.PENDING }, _sum: { amount: true } })
        await tx.user.update({ where: { id: fine.userId }, data: { totalFines: sum._sum.amount ?? 0 } })
      })

      return NextResponse.json({ ok: true })
    }

    if (status === "WAIVED") {
      await prisma.$transaction(async (tx) => {
        const fine = await tx.fine.findUnique({ where: { id }, select: { id: true, userId: true } })
        if (!fine) throw new Error("NOT_FOUND")

        await tx.fine.update({
          where: { id },
          data: {
            status: FineStatus.WAIVED,
            waivedAt: new Date(),
            waivedBy: typeof (body as any).waived_by === "string" ? (body as any).waived_by : null,
            waiverReason: typeof (body as any).waiver_reason === "string" ? (body as any).waiver_reason : null,
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
