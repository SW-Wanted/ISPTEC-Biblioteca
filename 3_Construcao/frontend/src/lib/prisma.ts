import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Declaração para o Global do Node em desenvolvimento
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuração do pool de conexões com Supabase
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ?? 
  new PrismaClient({ 
    adapter // O Prisma 7 EXIGE o adaptador aqui
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
