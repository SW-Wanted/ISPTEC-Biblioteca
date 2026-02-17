import path from "node:path"
import { defineConfig } from "prisma/config"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, ".env") })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
    shadowDatabaseUrl: process.env.DATABASE_URL 
  },
})
