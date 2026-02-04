import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationStatus, UserStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, status: true, isBlocked: true },
  });

  // ✅ Permitir PENDING (usuários em onboarding também recebem notificações)
  // ❌ Bloquear apenas INACTIVE e bloqueados
  if (!user || user.status === UserStatus.INACTIVE || user.isBlocked) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const notif = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!notif || notif.userId !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (notif.status === NotificationStatus.READ) {
    return NextResponse.json({ ok: true });
  }

  await prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.READ, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
