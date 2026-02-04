-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FAQ_order_idx" ON "FAQ"("order");

-- CreateIndex
CREATE INDEX "FAQ_isActive_idx" ON "FAQ"("isActive");

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default FAQs
INSERT INTO "FAQ" ("id", "question", "answer", "order", "isActive", "createdAt", "updatedAt") VALUES
('faq_001', 'Como faço para me cadastrar na biblioteca?', 'O cadastro pode ser feito online através do portal. Você precisará fazer upload dos seus documentos (cartão de estudante ou cartão de colaborador) para validação. Após aprovação, receberá sua credencial digital com QR Code.', 1, true, NOW(), NOW()),
('faq_002', 'Quantos livros posso emprestar?', 'Estudantes podem emprestar até 2 livros por 5 dias. Docentes podem emprestar até 4 livros por 15 dias. Livros de cedência por dia têm limite de 1 exemplar para todos.', 2, true, NOW(), NOW()),
('faq_003', 'Como renovar um empréstimo?', 'Acesse ''Meus Empréstimos'' no menu e clique em ''Renovar'' no livro desejado. Você pode renovar até 2 vezes, desde que não haja reservas pendentes e você não tenha multas.', 3, true, NOW(), NOW()),
('faq_004', 'E se o livro que eu quero não está disponível?', 'Você pode entrar na fila de espera. Quando o livro for devolvido, você será notificado e terá 48 horas para retirá-lo na biblioteca.', 4, true, NOW(), NOW()),
('faq_005', 'Como funciona o sistema de multas?', 'Multas são aplicadas por atraso na devolução, conforme a tabela do regulamento. Enquanto houver multas pendentes, novos empréstimos e renovações ficam bloqueados.', 5, true, NOW(), NOW());
