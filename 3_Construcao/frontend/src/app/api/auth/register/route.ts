import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { UserStatus, UserType } from "@prisma/client"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: "Email já registado" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(input.password, 10)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashed,
        name: input.name ?? input.email.split("@")[0],
        type: UserType.STUDENT,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true, name: true, type: true },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: user.name,
      type: user.type,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 })
    }
    console.error("POST /api/auth/register error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
