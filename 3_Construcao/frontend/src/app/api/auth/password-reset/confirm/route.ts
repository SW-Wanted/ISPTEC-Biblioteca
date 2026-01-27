import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const confirmSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
})

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export async function POST(request: Request) {
  const bodyUnknown: unknown = await request.json().catch(() => null)
  const parsed = confirmSchema.safeParse(bodyUnknown)

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const tokenHash = sha256Hex(parsed.data.token)

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!record) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 })
  }

  const now = new Date()
  if (record.usedAt || record.expiresAt.getTime() < now.getTime()) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    })

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
