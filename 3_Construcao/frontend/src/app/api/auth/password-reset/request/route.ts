import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { UserStatus } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  email: z.string().email(),
})

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function getBaseUrl(request: Request): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")

  const proto = request.headers.get("x-forwarded-proto") ?? "http"
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!host) return "http://localhost:3000"
  return `${proto}://${host}`
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || "SGBU <no-reply@sgbu.local>"

  if (!resendKey) {
    // Dev/placeholder fallback
    console.log("[password-reset] EMAIL (dev placeholder)", { to, subject, html })
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[password-reset] Failed to send email", { status: res.status, text })
  }
}

export async function POST(request: Request) {
  const bodyUnknown: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(bodyUnknown)

  // Anti-enumeration: always return the same response.
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const email = parsed.data.email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  })

  if (!user || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 60 min

  // Create token (best effort). If unique collision happens, retry once.
  try {
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })
  } catch {
    const rawToken2 = crypto.randomBytes(32).toString("hex")
    const tokenHash2 = sha256Hex(rawToken2)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash2,
        expiresAt,
      },
    })

    const baseUrl = getBaseUrl(request)
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken2)}`
    await sendEmail({
      to: user.email,
      subject: "Recuperação de senha",
      html: `<p>Recebemos um pedido para redefinir a tua senha.</p><p><a href="${link}">Clique aqui para redefinir</a></p><p>Este link expira em 60 minutos.</p>`,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const baseUrl = getBaseUrl(request)
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`

  await sendEmail({
    to: user.email,
    subject: "Recuperação de senha",
    html: `<p>Recebemos um pedido para redefinir a tua senha.</p><p><a href="${link}">Clique aqui para redefinir</a></p><p>Este link expira em 60 minutos.</p>`,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
