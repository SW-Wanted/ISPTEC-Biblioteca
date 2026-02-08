import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Aplicando migration FAQ...\n");

  try {
    // Tentar contar FAQs para ver se tabela existe
    try {
      const count = await prisma.fAQ.count();
      console.log(`✅ Tabela FAQ já existe! Total: ${count}`);

      const faqs = await prisma.fAQ.findMany({ orderBy: { order: "asc" } });
      console.log("\n📋 FAQs existentes:");
      faqs.forEach((f) => console.log(`   ${f.order}. ${f.question}`));
      return;
    } catch (e: unknown) {
      console.log("⚠️  Tabela não existe. Criando...\n");
    }

    // Criar tabela com $executeRaw (mais compatível com Accelerate)
    await prisma.$executeRaw`
      CREATE TABLE "FAQ" (
        "id" TEXT PRIMARY KEY,
        "question" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "order" INTEGER DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "createdById" TEXT,
        "updatedById" TEXT
      )`;
    console.log("✅ Tabela criada!");

    await prisma.$executeRaw`CREATE INDEX "FAQ_order_idx" ON "FAQ"("order")`;
    await prisma.$executeRaw`CREATE INDEX "FAQ_isActive_idx" ON "FAQ"("isActive")`;
    console.log("✅ Índices criados!");

    await prisma.$executeRaw`
      ALTER TABLE "FAQ" 
      ADD CONSTRAINT "FAQ_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "User"("id") 
      ON DELETE SET NULL`;

    await prisma.$executeRaw`
      ALTER TABLE "FAQ" 
      ADD CONSTRAINT "FAQ_updatedById_fkey" 
      FOREIGN KEY ("updatedById") REFERENCES "User"("id") 
      ON DELETE SET NULL`;
    console.log("✅ Foreign keys criadas!");

    // Inserir FAQs usando create (mais seguro)
    await prisma.fAQ.create({
      data: {
        id: "faq_001",
        question: "Como faço para me cadastrar na biblioteca?",
        answer:
          "O cadastro pode ser feito online através do portal. Você precisará fazer upload dos seus documentos (cartão de estudante ou cartão de colaborador) para validação. Após aprovação, receberá sua credencial digital com QR Code.",
        order: 1,
        isActive: true,
      },
    });

    await prisma.fAQ.create({
      data: {
        id: "faq_002",
        question: "Quantos livros posso emprestar?",
        answer:
          "Estudantes podem emprestar até 2 livros por 5 dias. Docentes podem emprestar até 4 livros por 15 dias. Livros de cedência por dia têm limite de 1 exemplar para todos.",
        order: 2,
        isActive: true,
      },
    });

    await prisma.fAQ.create({
      data: {
        id: "faq_003",
        question: "Como renovar um empréstimo?",
        answer:
          "Acesse 'Meus Empréstimos' no menu e clique em 'Renovar' no livro desejado. Você pode renovar até 2 vezes, desde que não haja reservas pendentes e você não tenha multas.",
        order: 3,
        isActive: true,
      },
    });

    await prisma.fAQ.create({
      data: {
        id: "faq_004",
        question: "E se o livro que eu quero não está disponível?",
        answer:
          "Você pode entrar na fila de espera. Quando o livro for devolvido, você será notificado e terá 48 horas para retirá-lo na biblioteca.",
        order: 4,
        isActive: true,
      },
    });

    await prisma.fAQ.create({
      data: {
        id: "faq_005",
        question: "Como funciona o sistema de multas?",
        answer:
          "Multas são aplicadas por atraso na devolução, conforme a tabela do regulamento. Enquanto houver multas pendentes, novos empréstimos e renovações ficam bloqueados.",
        order: 5,
        isActive: true,
      },
    });

    console.log("✅ 5 FAQs inseridas!");

    const count = await prisma.fAQ.count();
    console.log(`\n✨ Sucesso! Total de FAQs: ${count}\n`);
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
