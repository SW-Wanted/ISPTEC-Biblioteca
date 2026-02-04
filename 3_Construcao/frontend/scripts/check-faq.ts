import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verificando tabela FAQ...\n");

  const count = await prisma.fAQ.count();
  console.log(`✅ Total de FAQs: ${count}\n`);

  const faqs = await prisma.fAQ.findMany({
    orderBy: { order: "asc" },
  });

  console.log("📋 FAQs na base de dados:\n");
  faqs.forEach((faq) => {
    console.log(`${faq.order}. ${faq.question}`);
    console.log(`   Status: ${faq.isActive ? "✅ Ativa" : "❌ Inativa"}`);
    console.log(`   Resposta: ${faq.answer.substring(0, 80)}...`);
    console.log();
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
