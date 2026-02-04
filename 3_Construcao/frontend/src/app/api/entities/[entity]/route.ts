import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  BookStatus,
  FineStatus,
  FineType,
  LoanStatus,
  LoanPolicy,
  MaterialType,
  NotificationStatus,
  NotificationType,
  Prisma,
  ReservationStatus,
  RequestStatus,
  UserStatus,
  UserType,
} from "@prisma/client";
import {
  calculateDueDate,
  clampInt,
  FINE_PER_DAY_KZ,
  LOAN_LIMITS,
  normalizeEnum,
  toIso,
} from "@/lib/sgbu-rules";

const filterSchema = z.record(z.string(), z.unknown()).optional();

const jsonObjectSchema = z.record(z.string(), z.unknown());

type BookRatingStats = {
  bookId: string;
  averageRating: number;
  totalReviews: number;
};

function isEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown,
): value is T[keyof T] {
  if (typeof value !== "string") return false;
  return Object.values(enumObj).includes(value as T[keyof T]);
}

function lowerEnum(value: string): string {
  return value.toLowerCase();
}

function canManageBooks(type: UserType) {
  return (
    type === UserType.SUPERVISOR ||
    type === UserType.LIBRARIAN ||
    type === UserType.CATALOGER
  );
}

function canManageLoans(type: UserType) {
  return (
    type === UserType.SUPERVISOR ||
    type === UserType.LIBRARIAN ||
    type === UserType.STAFF
  );
}

function canManageMembers(type: UserType) {
  return (
    type === UserType.SUPERVISOR ||
    type === UserType.LIBRARIAN ||
    type === UserType.STAFF
  );
}

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      type: true,
      status: true,
      isBlocked: true,
      totalFines: true,
    },
  });
  if (!user) return null;
  // ✅ Permitir PENDING (para acessar notificações durante onboarding)
  // ❌ Bloquear apenas INACTIVE e usuários bloqueados
  if (user.status === UserStatus.INACTIVE || user.isBlocked) return null;

  return user;
}

async function syncOverdueLoansAndFines(userId?: string) {
  const now = new Date();

  const overdueLoans = await prisma.loan.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      dueDate: { lt: now },
      returnDate: null,
    },
    select: {
      id: true,
      userId: true,
      dueDate: true,
      status: true,
      fineAmount: true,
      daysOverdue: true,
    },
  });

  if (overdueLoans.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const loan of overdueLoans) {
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const fineAmount = daysOverdue * FINE_PER_DAY_KZ;

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.OVERDUE,
          daysOverdue,
          fineAmount: fineAmount,
        },
      });

      if (fineAmount > 0) {
        const existingFine = await tx.fine.findFirst({
          where: {
            loanId: loan.id,
            type: FineType.LATE_RETURN,
            status: FineStatus.PENDING,
          },
          select: { id: true },
        });

        if (!existingFine) {
          const createdFine = await tx.fine.create({
            data: {
              userId: loan.userId,
              loanId: loan.id,
              type: FineType.LATE_RETURN,
              amount: fineAmount,
              status: FineStatus.PENDING,
              reason: `Atraso de ${daysOverdue} dia(s) na devolução`,
            },
            select: { id: true },
          });

          await tx.notification.create({
            data: {
              userId: loan.userId,
              type: NotificationType.IN_APP,
              status: NotificationStatus.PENDING,
              title: "Multa pendente",
              message:
                "Tens uma multa pendente por atraso na devolução. Regularize para evitar bloqueio.",
              loanId: loan.id,
              metadata: {
                actionType: "pay_fine",
                fineId: createdFine.id,
                fineType: FineType.LATE_RETURN,
                amount: fineAmount,
                daysOverdue,
              },
            },
          });
        }
      }
    }

    if (userId) {
      const sum = await tx.fine.aggregate({
        where: { userId, status: FineStatus.PENDING },
        _sum: { amount: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: { totalFines: sum._sum.amount ?? 0 },
      });
    }
  });
}

async function expireReservationsIfNeeded(bookId?: string) {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: {
      ...(bookId ? { bookId } : {}),
      status: ReservationStatus.AVAILABLE,
      expiryDate: { lt: now },
    },
    select: { id: true, bookId: true },
  });

  if (expired.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const res of expired) {
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      // shift queue positions for remaining actives
      const actives = await tx.reservation.findMany({
        where: { bookId: res.bookId, status: ReservationStatus.ACTIVE },
        orderBy: { queuePosition: "asc" },
        select: { id: true },
      });

      let pos = 1;
      for (const a of actives) {
        await tx.reservation.update({
          where: { id: a.id },
          data: { queuePosition: pos },
        });
        pos++;
      }

      // Try to notify next in queue if a copy is available
      const availableCopy = await tx.copy.findFirst({
        where: { bookId: res.bookId, status: BookStatus.AVAILABLE },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      if (availableCopy) {
        const next = await tx.reservation.findFirst({
          where: { bookId: res.bookId, status: ReservationStatus.ACTIVE },
          orderBy: { queuePosition: "asc" },
          select: { id: true, userId: true },
        });

        if (next) {
          const expiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
          await tx.reservation.update({
            where: { id: next.id },
            data: {
              status: ReservationStatus.AVAILABLE,
              availableDate: new Date(),
              expiryDate,
              notifiedAt: new Date(),
            },
          });

          await tx.copy.update({
            where: { id: availableCopy.id },
            data: { status: BookStatus.RESERVED },
          });

          await tx.notification.create({
            data: {
              userId: next.userId,
              type: NotificationType.IN_APP,
              status: NotificationStatus.PENDING,
              title: "Livro disponível!",
              message:
                "O livro reservado ficou disponível. Tens 48h para levantar.",
              reservationId: next.id,
            },
          });
        }
      }

      // Keep book counters consistent
      const counts = await tx.copy.groupBy({
        by: ["status"],
        where: { bookId: res.bookId },
        _count: { _all: true },
      });
      const totalCopies = counts.reduce((acc, c) => acc + c._count._all, 0);
      const availableCopies = counts
        .filter((c) => c.status === BookStatus.AVAILABLE)
        .reduce((acc, c) => acc + c._count._all, 0);

      await tx.book.update({
        where: { id: res.bookId },
        data: { totalCopies, availableCopies },
      });
    }
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;

  const user = await requireUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? undefined;
  const take = searchParams.get("take") ?? undefined;
  const filterRaw = searchParams.get("filter");

  const limit = typeof take === "string" ? clampInt(take, 1, 500) : 200;

  const filter = filterRaw
    ? filterSchema.parse(JSON.parse(filterRaw))
    : undefined;

  if (entity === "Category") {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        created_date: toIso(c.createdAt),
        updated_date: toIso(c.updatedAt),
      })),
    );
  }

  if (entity === "Book") {
    const where = filter?.id ? { id: String(filter.id) } : undefined;

    // Default ordering (we may re-sort in-memory for derived fields)
    const orderBy =
      sort === "created_date"
        ? { createdAt: "asc" as const }
        : { createdAt: "desc" as const };

    const books = await prisma.book.findMany({
      where,
      include: {
        category: { select: { name: true } },
        publisher: { select: { name: true } },
        authors: {
          include: { author: { select: { name: true } } },
          orderBy: { order: "asc" },
        },
        copies: {
          select: { location: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy,
      take: limit,
    });

    const ratingGroups = await prisma.bookReview.groupBy({
      by: ["bookId"],
      where:
        books.length > 0
          ? { bookId: { in: books.map((b) => b.id) } }
          : undefined,
      _avg: { rating: true },
      _count: { _all: true },
    });

    const statsByBookId = new Map<string, BookRatingStats>();
    for (const row of ratingGroups) {
      statsByBookId.set(row.bookId, {
        bookId: row.bookId,
        averageRating: row._avg.rating ? Number(row._avg.rating) : 0,
        totalReviews: row._count._all,
      });
    }

    const mapped = books.map((b) => {
      const stats = statsByBookId.get(b.id);
      const totalReviews = stats ? stats.totalReviews : 0;
      const averageRating = stats ? stats.averageRating : null;
      return {
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
        average_rating: totalReviews > 0 ? averageRating : null,
        total_reviews: totalReviews,
        total_loans: null,
      };
    });

    if (sort === "-average_rating" || sort === "average_rating") {
      const dir = sort === "-average_rating" ? -1 : 1;
      mapped.sort((a, b) => {
        const av = typeof a.average_rating === "number" ? a.average_rating : 0;
        const bv = typeof b.average_rating === "number" ? b.average_rating : 0;
        if (av !== bv) return (av - bv) * dir;
        const at = typeof a.total_reviews === "number" ? a.total_reviews : 0;
        const bt = typeof b.total_reviews === "number" ? b.total_reviews : 0;
        if (at !== bt) return (at - bt) * dir;
        return (
          new Date(b.created_date ?? 0).getTime() -
          new Date(a.created_date ?? 0).getTime()
        );
      });
    }

    if (sort === "-total_reviews" || sort === "total_reviews") {
      const dir = sort === "-total_reviews" ? -1 : 1;
      mapped.sort((a, b) => {
        const av = typeof a.total_reviews === "number" ? a.total_reviews : 0;
        const bv = typeof b.total_reviews === "number" ? b.total_reviews : 0;
        if (av !== bv) return (av - bv) * dir;
        return (
          new Date(b.created_date ?? 0).getTime() -
          new Date(a.created_date ?? 0).getTime()
        );
      });
    }

    return NextResponse.json(mapped);
  }

  if (entity === "BookReview") {
    // Any authenticated user can read book reviews
    const where: Prisma.BookReviewWhereInput = {};
    if (filter?.book_id) where.bookId = String(filter.book_id);
    if (filter?.user_id) where.user = { email: String(filter.user_id) };

    const reviews = await prisma.bookReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(
      reviews.map((r) => ({
        id: r.id,
        book_id: r.bookId,
        user_id: r.user.email,
        user_name: r.user.name,
        rating: r.rating,
        review: r.review,
        is_verified_read: r.isVerifiedRead,
        created_at: toIso(r.createdAt) ?? null,
        created_date: toIso(r.createdAt),
        updated_date: toIso(r.updatedAt),
      })),
    );
  }

  if (entity === "Member") {
    const where = filter?.user_id
      ? { email: String(filter.user_id) }
      : undefined;

    // Non-staff users may only read their own profile
    if (!canManageMembers(user.type)) {
      if (!where || where.email !== user.email) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

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
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        user_id: m.email,
        full_name: m.name,
        status: lowerEnum(m.status),
        role: lowerEnum(m.type),
        total_fines: Number(m.totalFines),
        notification_preferences: {
          preferred: lowerEnum(m.preferredNotification),
        },
        created_date: toIso(m.createdAt),
        updated_date: toIso(m.updatedAt),
      })),
    );
  }

  if (entity === "Loan") {
    const where: Prisma.LoanWhereInput = {};
    if (filter?.member_id) where.user = { email: String(filter.member_id) };
    if (typeof filter?.status === "string") {
      const s = normalizeEnum(filter.status);
      if (isEnumValue(LoanStatus, s)) where.status = s;
    }

    // Non-librarian users may only read their own loans
    if (!canManageLoans(user.type)) {
      const memberEmail = filter?.member_id ? String(filter.member_id) : null;
      if (!memberEmail || memberEmail !== user.email) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
      await syncOverdueLoansAndFines(user.id);
    } else {
      await syncOverdueLoansAndFines();
    }

    const orderBy =
      sort === "-loan_date"
        ? { loanDate: "desc" as const }
        : { loanDate: "desc" as const };

    const loans = await prisma.loan.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        user: { select: { email: true, name: true, type: true } },
        copy: { include: { book: { select: { id: true, title: true } } } },
      },
    });

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
      })),
    );
  }

  if (entity === "Reservation") {
    await expireReservationsIfNeeded();

    const where: Prisma.ReservationWhereInput = {};
    if (filter?.member_id) where.user = { email: String(filter.member_id) };
    if (filter?.book_id) where.bookId = String(filter.book_id);
    if (typeof filter?.status === "string") {
      const s = normalizeEnum(filter.status);
      if (isEnumValue(ReservationStatus, s)) where.status = s;
    }

    // 🔒 SGBU-006: Utilizador não-staff só vê suas próprias reservas
    if (!canManageMembers(user.type)) {
      const memberEmail = filter?.member_id ? String(filter.member_id) : null;
      if (!memberEmail || memberEmail !== user.email) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
      where.userId = user.id;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ reservationDate: "desc" }, { queuePosition: "asc" }],
      take: limit,
      include: {
        user: { select: { email: true } },
        book: { select: { title: true } },
      },
    });

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
      })),
    );
  }

  if (entity === "Copy") {
    const where: Prisma.CopyWhereInput = {};
    if (filter?.book_id) where.bookId = String(filter.book_id);
    if (typeof filter?.status === "string") {
      const s = normalizeEnum(filter.status);
      if (isEnumValue(BookStatus, s)) where.status = s;
    }

    const copies = await prisma.copy.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        bookId: true,
        barcode: true,
        status: true,
        location: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      copies.map((c) => ({
        id: c.id,
        book_id: c.bookId,
        barcode: c.barcode,
        status: lowerEnum(c.status),
        location: c.location,
        created_date: toIso(c.createdAt),
        updated_date: toIso(c.updatedAt),
      })),
    );
  }

  if (entity === "Fine") {
    if (!canManageMembers(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const where: Prisma.FineWhereInput = {};
    if (filter?.member_id) where.user = { email: String(filter.member_id) };
    if (typeof filter?.status === "string") {
      const s = normalizeEnum(filter.status);
      if (isEnumValue(FineStatus, s)) where.status = s;
    }

    const fines = await prisma.fine.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: {
        user: { select: { email: true, name: true } },
        loan: { select: { id: true } },
      },
    });

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
      })),
    );
  }

  if (entity === "Notification") {
    // Segurança: cada utilizador só pode ver as suas próprias notificações.
    const where: Prisma.NotificationWhereInput = { userId: user.id };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json(
      notifications.map((n) => {
        const meta = n.metadata as unknown as { actionType?: unknown } | null;
        const metaActionType =
          meta && typeof meta === "object" ? meta.actionType : undefined;

        const derivedActionType =
          typeof metaActionType === "string"
            ? metaActionType
            : n.reservationId
              ? "collect_reservation"
              : n.loanId
                ? "view_loan"
                : "none";

        return {
          id: n.id,
          user_id: n.user.email,
          title: n.title,
          message: n.message,
          status: lowerEnum(n.status),
          type: lowerEnum(n.type),
          loan_id: n.loanId ?? null,
          reservation_id: n.reservationId ?? null,
          action_type: derivedActionType,
          read_at: toIso(n.readAt) ?? null,
          created_date: toIso(n.createdAt),
          updated_date: toIso(n.updatedAt),
        };
      }),
    );
  }

  if (entity === "Locker") {
    const lockers = await prisma.locker.findMany({
      orderBy: { number: "asc" },
      take: limit,
      select: {
        id: true,
        number: true,
        location: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(
      lockers.map((l) => ({
        id: l.id,
        number: l.number,
        location: l.location,
        status: lowerEnum(l.status),
        created_date: toIso(l.createdAt),
        updated_date: toIso(l.updatedAt),
      })),
    );
  }

  if (entity === "Computer") {
    const computers = await prisma.computer.findMany({
      orderBy: [{ location: "asc" }, { number: "asc" }],
      take: limit,
      select: {
        id: true,
        number: true,
        location: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(
      computers.map((c) => ({
        id: c.id,
        number: c.number,
        location: c.location,
        status: lowerEnum(c.status),
        created_date: toIso(c.createdAt),
        updated_date: toIso(c.updatedAt),
      })),
    );
  }

  if (entity === "SpecialRequest") {
    const where: Prisma.SpecialRequestWhereInput = {};
    if (filter?.user_id) where.user = { email: String(filter.user_id) };
    if (typeof filter?.status === "string") {
      const s = normalizeEnum(filter.status);
      if (isEnumValue(RequestStatus, s)) where.status = s;
    }

    const requests = await prisma.specialRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: limit,
      include: { user: { select: { email: true, name: true } } },
    });

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
      })),
    );
  }

  return NextResponse.json(
    { error: "Entidade não suportada" },
    { status: 404 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;

  const user = await requireUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (
    !bodyUnknown ||
    typeof bodyUnknown !== "object" ||
    Array.isArray(bodyUnknown)
  ) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const body = jsonObjectSchema.parse(bodyUnknown);

  if (entity === "BookReview") {
    // Any authenticated user can review a book
    const reviewCreateSchema = z.object({
      book_id: z.string().min(1),
      rating: z.number().int().min(1).max(5),
      review: z.string().nullable().optional(),
    });

    const parsed = reviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const bookId = parsed.data.book_id;
    const reviewText = parsed.data.review ? parsed.data.review.trim() : null;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    if (!book)
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );

    const saved = await prisma.bookReview.upsert({
      where: {
        bookId_userId: {
          bookId,
          userId: user.id,
        },
      },
      create: {
        bookId,
        userId: user.id,
        rating: parsed.data.rating,
        review: reviewText && reviewText.length > 0 ? reviewText : null,
        isVerifiedRead: false,
      },
      update: {
        rating: parsed.data.rating,
        review: reviewText && reviewText.length > 0 ? reviewText : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: saved.id });
  }

  if (entity === "Book") {
    if (!canManageBooks(user.type))
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const bookCreateSchema = z.object({
      title: z.string().min(1),
      subtitle: z.string().nullable().optional(),
      isbn: z.string().nullable().optional(),
      edition: z.string().nullable().optional(),
      publication_year: z.number().int().nullable().optional(),
      language: z.string().optional(),
      pages: z.number().int().nullable().optional(),
      description: z.string().nullable().optional(),
      cover_url: z.string().nullable().optional(),
      category: z.string().min(1),
      publisher: z.string().nullable().optional(),
      authors: z.array(z.string()).optional(),
      total_copies: z.number().int().optional(),
      available_copies: z.number().int().optional(),
      location: z.string().optional(),
    });

    const parsed = bookCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const title = parsed.data.title.trim();
    if (!title)
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 },
      );

    const isbn = parsed.data.isbn ? parsed.data.isbn.trim() : null;
    const categoryName = parsed.data.category.trim();
    if (!categoryName)
      return NextResponse.json(
        { error: "Categoria é obrigatória" },
        { status: 400 },
      );

    const publisherName = parsed.data.publisher
      ? parsed.data.publisher.trim()
      : null;

    const authors = (parsed.data.authors ?? [])
      .map((a) => a.trim())
      .filter(Boolean);

    const totalCopies = clampInt(parsed.data.total_copies ?? 1, 1, 500);
    const availableCopies = clampInt(
      parsed.data.available_copies ?? totalCopies,
      0,
      totalCopies,
    );
    const location =
      typeof parsed.data.location === "string"
        ? parsed.data.location.trim()
        : "";

    const created = await prisma.$transaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });

      const publisher = publisherName
        ? await tx.publisher.upsert({
            where: { name: publisherName },
            update: {},
            create: { name: publisherName },
          })
        : null;

      const book = await tx.book.create({
        data: {
          title,
          subtitle: parsed.data.subtitle ?? null,
          isbn,
          edition: parsed.data.edition ?? null,
          publicationYear: parsed.data.publication_year ?? null,
          language: parsed.data.language ?? "pt",
          pages: parsed.data.pages ?? null,
          description: parsed.data.description ?? null,
          coverUrl: parsed.data.cover_url ?? null,
          categoryId: category.id,
          publisherId: publisher?.id ?? null,
          keywords: [],
          materialType: MaterialType.BOOK,
          loanPolicy: LoanPolicy.STANDARD,
          totalCopies,
          availableCopies: availableCopies,
          extractedByOCR: false,
        },
      });

      if (authors.length > 0) {
        for (let i = 0; i < authors.length; i++) {
          const name = authors[i];
          const existingAuthor = await tx.author.findFirst({
            where: { name },
            select: { id: true },
          });
          const author =
            existingAuthor ??
            (await tx.author.create({ data: { name }, select: { id: true } }));
          await tx.bookAuthor.create({
            data: { bookId: book.id, authorId: author.id, order: i + 1 },
          });
        }
      }

      const copiesToCreate = totalCopies;
      for (let i = 0; i < copiesToCreate; i++) {
        const barcode = `AUTO-${book.id.slice(-6)}-${Date.now().toString(16)}-${i + 1}`;
        await tx.copy.create({
          data: {
            bookId: book.id,
            barcode,
            status:
              i < availableCopies
                ? BookStatus.AVAILABLE
                : BookStatus.MAINTENANCE,
            location: location || "N/A",
          },
        });
      }

      return book;
    });

    return NextResponse.json({ id: created.id });
  }

  if (entity === "Reservation") {
    // Any authenticated user can reserve
    const reservationCreateSchema = z.object({ book_id: z.string().min(1) });
    const parsed = reservationCreateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "book_id é obrigatório" },
        { status: 400 },
      );
    const bookId = parsed.data.book_id;

    await expireReservationsIfNeeded(bookId);

    // 🔒 SGBU-006: Impedir reservas duplicadas (mesmo usuário não pode reservar o mesmo livro mais de uma vez)
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        bookId,
        userId: user.id,
        status: { in: [ReservationStatus.ACTIVE, ReservationStatus.AVAILABLE] },
      },
      select: { id: true, status: true },
    });

    if (existingReservation) {
      const statusMsg =
        existingReservation.status === ReservationStatus.AVAILABLE
          ? "já está disponível para levantamento"
          : "já está na fila de espera";
      return NextResponse.json(
        {
          error: `Já tens uma reserva ativa para este livro que ${statusMsg}.`,
        },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.reservation.count({
        where: { bookId, status: ReservationStatus.ACTIVE },
      });

      const res = await tx.reservation.create({
        data: {
          bookId,
          userId: user.id,
          status: ReservationStatus.ACTIVE,
          queuePosition: activeCount + 1,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.IN_APP,
          status: NotificationStatus.PENDING,
          title: "Reserva registada",
          message: `A sua reserva foi registada. Posição na fila: ${activeCount + 1}.`,
          reservationId: res.id,
        },
      });

      return res;
    });

    return NextResponse.json({ id: created.id });
  }

  if (entity === "Notification") {
    const notificationCreateSchema = z.object({
      user_id: z.string().optional(),
      title: z.string().min(1),
      message: z.string().min(1),
    });
    const parsed = notificationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "title e message são obrigatórios" },
        { status: 400 },
      );
    }

    const targetEmail = parsed.data.user_id
      ? parsed.data.user_id.trim()
      : user.email;

    // Only admins can create notification for other users
    if (targetEmail !== user.email && !canManageMembers(user.type)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 },
      );

    const title = parsed.data.title.trim();
    const message = parsed.data.message;
    if (!title || !message)
      return NextResponse.json(
        { error: "title e message são obrigatórios" },
        { status: 400 },
      );

    const created = await prisma.notification.create({
      data: {
        userId: target.id,
        type: NotificationType.IN_APP,
        status: NotificationStatus.PENDING,
        title,
        message,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id });
  }

  if (entity === "SpecialRequest") {
    const specialRequestCreateSchema = z.object({
      type: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      scheduled_date: z.string().optional().nullable(),
    });
    const parsed = specialRequestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "type, title e description são obrigatórios" },
        { status: 400 },
      );
    }

    const type = parsed.data.type.trim().toUpperCase();
    const title = parsed.data.title.trim();
    const description = parsed.data.description;
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "type, title e description são obrigatórios" },
        { status: 400 },
      );
    }

    const scheduledDate = parsed.data.scheduled_date
      ? new Date(String(parsed.data.scheduled_date))
      : null;

    const created = await prisma.specialRequest.create({
      data: {
        userId: user.id,
        type,
        title,
        description,
        scheduledDate,
      },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.IN_APP,
        status: NotificationStatus.PENDING,
        title: "Solicitação enviada",
        message: `A sua solicitação (${type}) foi recebida e está em análise.`,
      },
    });

    return NextResponse.json({ id: created.id });
  }

  if (entity === "Loan") {
    // 🔒 FASE 2: Apenas funcionários da biblioteca (LIBRARIAN/STAFF) podem criar empréstimos
    // Estudantes/Docentes não podem criar empréstimos diretamente - devem fazer reserva primeiro
    if (!canManageLoans(user.type)) {
      return NextResponse.json(
        {
          error:
            "Apenas funcionários da biblioteca podem criar empréstimos. Estudantes e docentes devem fazer reserva primeiro.",
        },
        { status: 403 },
      );
    }

    const loanCreateSchema = z.object({
      member_id: z.string().min(1),
      book_id: z.string().min(1),
    });
    const parsed = loanCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "member_id e book_id são obrigatórios" },
        { status: 400 },
      );
    }

    const memberId = parsed.data.member_id.trim();
    const bookId = parsed.data.book_id.trim();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const member = await tx.user.findUnique({
          where: { email: memberId },
          select: {
            id: true,
            type: true,
            status: true,
            isBlocked: true,
            totalFines: true,
          },
        });
        if (
          !member ||
          member.status !== UserStatus.ACTIVE ||
          member.isBlocked
        ) {
          throw new Error("MEMBER_INVALID");
        }
        if (Number(member.totalFines) > 0) {
          throw new Error("MEMBER_HAS_FINES");
        }

        const activeLoans = await tx.loan.count({
          where: {
            userId: member.id,
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
          },
        });
        const limits = LOAN_LIMITS[member.type];
        if (activeLoans >= limits.maxBooks) {
          throw new Error("LOAN_LIMIT");
        }

        // 📚 SGBU-007: Obter informações do livro (materialType, loanPolicy)
        const book = await tx.book.findUnique({
          where: { id: bookId },
          select: {
            id: true,
            title: true,
            materialType: true,
            loanPolicy: true,
          },
        });
        if (!book) {
          throw new Error("BOOK_NOT_FOUND");
        }

        // 📚 SGBU-007: Validar se material permite empréstimo
        if (book.loanPolicy === "NO_LOAN") {
          throw new Error("NO_LOAN_REFERENCE");
        }

        // 📚 SGBU-007: Validar 1 obra por título (Artigo 10º)
        const existingLoanSameTitle = await tx.loan.findFirst({
          where: {
            userId: member.id,
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
            copy: {
              bookId: book.id,
            },
          },
          select: { id: true },
        });
        if (existingLoanSameTitle) {
          throw new Error("ONE_COPY_PER_TITLE");
        }

        await expireReservationsIfNeeded(bookId);

        const hasOtherReservations = await tx.reservation.findFirst({
          where: {
            bookId,
            status: ReservationStatus.ACTIVE,
            NOT: { userId: member.id },
          },
          select: { id: true },
        });
        if (hasOtherReservations) {
          throw new Error("HAS_RESERVATIONS");
        }

        const copy = await tx.copy.findFirst({
          where: { bookId, status: BookStatus.AVAILABLE },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (!copy) {
          throw new Error("NO_COPY");
        }

        // 📅 SGBU-007: Calcular dueDate baseado em loanPolicy
        const dueDate = calculateDueDate(member.type, book.loanPolicy);

        const loan = await tx.loan.create({
          data: {
            userId: member.id,
            copyId: copy.id,
            dueDate,
            status: LoanStatus.ACTIVE,
          },
        });

        await tx.copy.update({
          where: { id: copy.id },
          data: { status: BookStatus.BORROWED },
        });

        const availableCopies = await tx.copy.count({
          where: { bookId, status: BookStatus.AVAILABLE },
        });
        const totalCopies = await tx.copy.count({ where: { bookId } });
        await tx.book.update({
          where: { id: bookId },
          data: { availableCopies, totalCopies },
        });

        await tx.notification.create({
          data: {
            userId: member.id,
            type: NotificationType.IN_APP,
            status: NotificationStatus.PENDING,
            title: "Empréstimo registado",
            message: `O seu empréstimo foi registado. Data de devolução: ${dueDate.toISOString()}.`,
            loanId: loan.id,
          },
        });

        return loan;
      });

      return NextResponse.json({ id: result.id });
    } catch (error) {
      // 🚨 SGBU-007: Tratamento de erros específicos
      const errorMap: Record<string, { message: string; status: number }> = {
        MEMBER_INVALID: {
          message: "Utilizador inválido ou bloqueado",
          status: 400,
        },
        MEMBER_HAS_FINES: {
          message: "Regularize suas pendências financeiras antes de emprestar",
          status: 400,
        },
        LOAN_LIMIT: { message: "Limite de empréstimos atingido", status: 400 },
        BOOK_NOT_FOUND: { message: "Livro não encontrado", status: 404 },
        NO_LOAN_REFERENCE: {
          message: "Livro de referência não pode ser emprestado",
          status: 400,
        },
        ONE_COPY_PER_TITLE: {
          message: "Já tens um exemplar deste título emprestado (Artigo 10º)",
          status: 400,
        },
        HAS_RESERVATIONS: {
          message: "Livro tem reservas pendentes",
          status: 400,
        },
        NO_COPY: { message: "Nenhuma cópia disponível", status: 404 },
      };

      if (error instanceof Error) {
        const knownError = errorMap[error.message];
        if (knownError) {
          return NextResponse.json(
            { error: knownError.message },
            { status: knownError.status },
          );
        }
      }

      console.error("Erro ao criar empréstimo:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Entidade não suportada" },
    { status: 404 },
  );
}
