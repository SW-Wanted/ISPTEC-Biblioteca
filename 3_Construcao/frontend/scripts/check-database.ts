import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDatabase() {
  try {
    console.log("🔍 Verificando conexão com o banco de dados...");
    
    // Testar conexão
    await prisma.$connect();
    console.log("✅ Conexão estabelecida com sucesso!");

    // Verificar se a tabela CatalogEntry existe
    console.log("\n🔍 Verificando tabela CatalogEntry...");
    const count = await prisma.catalogEntry.count();
    console.log(`✅ Tabela CatalogEntry existe! Total de registros: ${count}`);

    // Verificar usuários
    console.log("\n🔍 Verificando usuários...");
    const users = await prisma.user.count();
    console.log(`✅ Total de usuários: ${users}`);

    // Verificar livros
    console.log("\n🔍 Verificando livros...");
    const books = await prisma.book.count();
    console.log(`✅ Total de livros: ${books}`);

  } catch (error) {
    console.error("❌ Erro ao verificar banco de dados:");
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkDatabase();
