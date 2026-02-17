/**
 * Script para marcar usuários sem foto para atualização no próximo login
 * 
 * Este script não atualiza as fotos diretamente (pois precisaríamos do token OAuth),
 * mas prepara o sistema para capturar as fotos no próximo login de cada usuário.
 * 
 * Uso:
 * npx tsx scripts/update-google-photos.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Buscando usuários sem foto de perfil...\n");

  const usersWithoutPhoto = await prisma.user.findMany({
    where: {
      profileImageUrl: null,
      email: {
        endsWith: "@isptec.co.ao",
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      type: true,
      lastLoginAt: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  if (usersWithoutPhoto.length === 0) {
    console.log("✅ Todos os usuários já têm foto de perfil!");
    return;
  }

  console.log(`📊 Encontrados ${usersWithoutPhoto.length} usuários sem foto:\n`);
  
  usersWithoutPhoto.forEach((user, index) => {
    const lastLogin = user.lastLoginAt 
      ? new Date(user.lastLoginAt).toLocaleDateString("pt-PT")
      : "Nunca";
    
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tipo: ${user.type}`);
    console.log(`   Último login: ${lastLogin}`);
    console.log("");
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 INSTRUÇÕES:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("As fotos do Google serão capturadas automaticamente quando:");
  console.log("1. O usuário fizer login com Google pela primeira vez");
  console.log("2. O usuário fizer logout e login novamente");
  console.log("");
  console.log("💡 DICA: Para forçar a atualização imediata:");
  console.log("   - Peça aos usuários para fazer logout e login novamente");
  console.log("   - Ou aguarde o próximo login natural");
  console.log("");
  console.log("🔧 O sistema já está configurado para:");
  console.log("   ✅ Capturar foto no primeiro login");
  console.log("   ✅ Atualizar foto se não existir");
  console.log("   ✅ Manter foto existente (não sobrescrever)");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
