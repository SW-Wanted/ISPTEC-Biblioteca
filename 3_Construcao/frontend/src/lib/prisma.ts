import { PrismaClient } from "@prisma/client"

declare const globalThis: typeof global & {
  prisma?: PrismaClient
}

export const prisma = globalThis.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma
}
