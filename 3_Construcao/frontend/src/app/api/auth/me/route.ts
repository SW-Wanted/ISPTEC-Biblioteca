import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json({
    id: (session.user as any).id,
    email: session.user.email,
    full_name: session.user.name ?? null,
    type: (session.user as any).type ?? null,
  })
}
