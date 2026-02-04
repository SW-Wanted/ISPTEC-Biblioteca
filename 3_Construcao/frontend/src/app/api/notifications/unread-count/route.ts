import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationStatus, UserStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, status: true, isBlocked: true },
  });

  // ✅ Permitir PENDING (para notificações durante onboarding)
  // ❌ Bloquear apenas INACTIVE e usuários bloqueados
  if (!user || user.status === UserStatus.INACTIVE || user.isBlocked) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: user.id,
      status: { not: NotificationStatus.READ },
    },
  });

  return NextResponse.json({ unreadCount });
}
