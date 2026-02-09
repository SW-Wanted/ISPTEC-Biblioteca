# Como Aplicar a Migration da Tabela FAQ

## ⚠️ Problema

A tabela FAQ ainda não existe no banco de dados, causando erro 500 ao tentar criar ou listar FAQs.

## ✅ Solução

Como estamos usando **Prisma Accelerate** (DATABASE_URL não está disponível localmente), precisaremos aplicar a migration diretamente no banco de produção.

### Opção 1: Via Prisma Studio / Dashboard do Prisma Accelerate

1. Acede ao [Prisma Data Platform](https://console.prisma.io/)
2. Selecionar o teu projeto
3. Ir em "Data Browser"
4. Executar o SQL da migration manualmente

### Opção 2: Via SQL Client (pgAdmin, psql, etc.)

Conectar ao banco PostgreSQL e executa o seguinte SQL:

```sql
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
CREATE INDEX "FAQ_isActive_idx" ON "FAQ"("isActive");

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default FAQs
INSERT INTO "FAQ" ("id", "question", "answer", "order", "isActive", "createdAt", "updatedAt") VALUES
('faq_001', 'Como faço para me cadastrar na biblioteca?', 'O cadastro pode ser feito online através do portal. Você precisará fazer upload dos seus documentos (cartão de estudante ou cartão de colaborador) para validação. Após aprovação, receberá sua credencial digital com QR Code.', 1, true, NOW(), NOW()),
('faq_002', 'Quantos livros posso emprestar?', 'Estudantes podem emprestar até 2 livros por 5 dias. Docentes podem emprestar até 4 livros por 15 dias. Livros de cedência por dia têm limite de 1 exemplar para todos.', 2, true, NOW(), NOW()),
('faq_003', 'Como renovar um empréstimo?', 'Acesse ''Meus Empréstimos'' no menu e clique em ''Renovar'' no livro desejado. Você pode renovar até 2 vezes, desde que não haja reservas pendentes e você não tenha multas.', 3, true, NOW(), NOW()),
('faq_004', 'E se o livro que eu quero não está disponível?', 'Você pode entrar na fila de espera. Quando o livro for devolvido, você será notificado e terá 48 horas para retirá-lo na biblioteca.', 4, true, NOW(), NOW()),
('faq_005', 'Como funciona o sistema de multas?', 'Multas são aplicadas por atraso na devolução, conforme a tabela do regulamento. Enquanto houver multas pendentes, novos empréstimos e renovações ficam bloqueados.', 5, true, NOW(), NOW());
```

### Opção 3: Atualizar URL de Conexão Temporariamente

1. Adiciona `DATABASE_URL` ao `.env` temporariamente
2. Execute: `npx prisma migrate deploy`
3. Remove `DATABASE_URL` do `.env`

## 🔍 Verificação

Após aplicar a migration, testa:

1. **Via API:**

   ```bash
   curl http://localhost:3000/api/settings/faqs
   ```

   Deve retornar as 5 FAQs padrão.

2. **Via Admin:**
   - Aceder a Admin → Settings → FAQs
   - Ver-se-a as 5 FAQs padrão
   - Tentar criar uma nova FAQ

3. **Via Help Page:**
   - Aceder à página de Ajuda
   - As FAQs devem aparecer dinamicamente do banco

## 📋 Estado Atual do Sistema

**Enquanto a tabela não existir:**

- ✅ API `/api/settings/faqs` retorna array vazio (não dá erro)
- ✅ Página Help mostra FAQs fallback (estáticas)
- ❌ Criar FAQ no admin dá erro 503 com mensagem explicativa

**Depois de aplicar a migration:**

- ✅ API retorna FAQs do banco
- ✅ Help page mostra FAQs dinâmicas
- ✅ Admin pode criar/editar/eliminar FAQs
- ✅ Sistema de auditoria funciona

## 🚀 Próximos Passos

Depois de aplicar a migration, reiniciar o servidor:

```bash
# Terminal npm
Ctrl+C
npm run dev
```
