# Migration: Training System and Account Activation

**Data:** 04 de Fevereiro de 2026  
**Autor:** Grupo 04 - SGBU ISPTEC  
**Descrição:** Adiciona sistema de formações e controle de ativação de contas

## ⚠️ IMPORTANTE

Esta migration precisa ser aplicada **MANUALMENTE** no banco de dados via Prisma Studio ou cliente PostgreSQL, pois o projeto usa **Prisma Accelerate** que não suporta migrations diretas via CLI.

---

## 📋 SQL a Executar

```sql
-- ========================================
-- 1. CRIAR ENUMS
-- ========================================

-- Enum para status de ativação de conta
CREATE TYPE "AccountActivationStatus" AS ENUM (
  'PENDING_DOCUMENTS',    -- Aguardando validação de documentos
  'PENDING_TRAINING',     -- Docs validados, aguardando formação
  'TRAINING_SCHEDULED',   -- Formação agendada
  'ACTIVE',               -- Formação completa, conta ativa
  'BLOCKED'               -- Bloqueado por multas/violações
);

-- Enum para status de sessões de formação
CREATE TYPE "TrainingStatus" AS ENUM (
  'SCHEDULED',      -- Agendada
  'IN_PROGRESS',    -- Em andamento
  'COMPLETED',      -- Concluída
  'CANCELLED'       -- Cancelada
);

-- ========================================
-- 2. ADICIONAR CAMPO activationStatus NA TABELA User
-- ========================================

ALTER TABLE "User"
ADD COLUMN "activationStatus" "AccountActivationStatus"
NOT NULL DEFAULT 'PENDING_DOCUMENTS';

-- Criar índice para buscar usuários por status de ativação
CREATE INDEX "User_activationStatus_idx" ON "User"("activationStatus");

-- ========================================
-- 3. CRIAR TABELA TrainingSession
-- ========================================

CREATE TABLE "TrainingSession" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT NOT NULL,
  "maxParticipants" INTEGER NOT NULL DEFAULT 20,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "actualDate" TIMESTAMP(3),
  "duration" INTEGER NOT NULL DEFAULT 120,
  "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- Índices para performance
CREATE INDEX "TrainingSession_trainerId_idx" ON "TrainingSession"("trainerId");
CREATE INDEX "TrainingSession_scheduledDate_idx" ON "TrainingSession"("scheduledDate");
CREATE INDEX "TrainingSession_status_idx" ON "TrainingSession"("status");

-- Foreign key para o formador
ALTER TABLE "TrainingSession"
ADD CONSTRAINT "TrainingSession_trainerId_fkey"
FOREIGN KEY ("trainerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ========================================
-- 4. CRIAR TABELA TrainingParticipant
-- ========================================

CREATE TABLE "TrainingParticipant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "attended" BOOLEAN NOT NULL DEFAULT false,
  "attendedAt" TIMESTAMP(3),
  "certificateUrl" TEXT,
  "certificateGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingParticipant_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "TrainingParticipant_userId_idx" ON "TrainingParticipant"("userId");
CREATE INDEX "TrainingParticipant_sessionId_idx" ON "TrainingParticipant"("sessionId");
CREATE INDEX "TrainingParticipant_attended_idx" ON "TrainingParticipant"("attended");

-- Unique constraint: um usuário não pode se inscrever duas vezes na mesma sessão
CREATE UNIQUE INDEX "TrainingParticipant_userId_sessionId_key"
ON "TrainingParticipant"("userId", "sessionId");

-- Foreign keys
ALTER TABLE "TrainingParticipant"
ADD CONSTRAINT "TrainingParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainingParticipant"
ADD CONSTRAINT "TrainingParticipant_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ========================================
-- 5. ATUALIZAR USUÁRIOS EXISTENTES
-- ========================================

-- Usuários que já têm todos os documentos aprovados → PENDING_TRAINING
UPDATE "User" u
SET "activationStatus" = 'PENDING_TRAINING'
WHERE u.id IN (
  SELECT ud."user_id"
  FROM "UserDocument" ud
  WHERE ud."documentType" IN ('ID', 'STUDENT_CARD', 'ENROLLMENT_PROOF')
  GROUP BY ud."user_id"
  HAVING COUNT(DISTINCT CASE WHEN ud."status" = 'APPROVED' THEN ud."documentType" END) = 3
)
AND u."activationStatus" = 'PENDING_DOCUMENTS';

-- Admins e bibliotecários já são ACTIVE por padrão
UPDATE "User"
SET "activationStatus" = 'ACTIVE'
WHERE "role" IN ('ADMIN', 'LIBRARIAN')
AND "activationStatus" != 'ACTIVE';

-- ========================================
-- 6. CRIAR SESSÃO DE FORMAÇÃO INICIAL (OPCIONAL)
-- ========================================

-- Inserir uma sessão de formação para teste
INSERT INTO "TrainingSession" (
  "id",
  "trainerId",
  "title",
  "description",
  "location",
  "maxParticipants",
  "scheduledDate",
  "duration",
  "status"
) VALUES (
  'training-' || gen_random_uuid()::text,
  (SELECT "id" FROM "User" WHERE "role" = 'LIBRARIAN' LIMIT 1),
  'Formação Inicial - Uso da Biblioteca ISPTEC',
  'Sessão introdutória sobre como utilizar os serviços da biblioteca: empréstimos, renovações, reservas, cacifos e computadores.',
  'Auditório Principal - Campus ISPTEC',
  30,
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  120,
  'SCHEDULED'
);

-- ========================================
-- 7. VERIFICAÇÕES FINAIS
-- ========================================

-- Contar usuários por status de ativação
SELECT
  "activationStatus",
  COUNT(*) as total
FROM "User"
GROUP BY "activationStatus"
ORDER BY total DESC;

-- Verificar se há sessões de formação criadas
SELECT COUNT(*) as total_sessions FROM "TrainingSession";

-- Verificar integridade das foreign keys
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
AND (conrelid::regclass::text LIKE '%Training%' OR confrelid::regclass::text LIKE '%Training%')
ORDER BY table_name;
```

---

## 🔄 Rollback (se necessário)

```sql
-- ATENÇÃO: Isso apagará TODOS os dados de formações!

-- 1. Remover foreign keys
ALTER TABLE "TrainingParticipant" DROP CONSTRAINT "TrainingParticipant_userId_fkey";
ALTER TABLE "TrainingParticipant" DROP CONSTRAINT "TrainingParticipant_sessionId_fkey";
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_trainerId_fkey";

-- 2. Dropar tabelas
DROP TABLE IF EXISTS "TrainingParticipant" CASCADE;
DROP TABLE IF EXISTS "TrainingSession" CASCADE;

-- 3. Remover coluna de User
ALTER TABLE "User" DROP COLUMN IF EXISTS "activationStatus";

-- 4. Dropar enums
DROP TYPE IF EXISTS "TrainingStatus";
DROP TYPE IF EXISTS "AccountActivationStatus";
```

---

## 📊 Impacto

- **Tabelas criadas:** 2 (`TrainingSession`, `TrainingParticipant`)
- **Enums criados:** 2 (`AccountActivationStatus`, `TrainingStatus`)
- **Campos adicionados:** 1 (`User.activationStatus`)
- **Índices criados:** 8
- **Constraints criados:** 4 (3 FKs + 1 unique)

---

## ✅ Validação Pós-Migration

Execute estas queries para confirmar que tudo está correto:

```sql
-- 1. Verificar se enums foram criados
SELECT typname, enumlabel
FROM pg_type
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typname IN ('AccountActivationStatus', 'TrainingStatus')
ORDER BY typname, enumsortorder;

-- 2. Verificar estrutura das tabelas
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('TrainingSession', 'TrainingParticipant')
ORDER BY table_name, ordinal_position;

-- 3. Verificar se campo foi adicionado ao User
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'activationStatus';

-- 4. Testar inserção (deve funcionar sem erros)
BEGIN;
  -- Criar sessão de teste
  INSERT INTO "TrainingSession" (id, trainerId, title, location, scheduledDate)
  VALUES (
    'test-session-001',
    (SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1),
    'Teste de Formação',
    'Sala 101',
    NOW() + INTERVAL '1 day'
  );

  -- Inscrever usuário
  INSERT INTO "TrainingParticipant" (id, userId, sessionId)
  VALUES (
    'test-participant-001',
    (SELECT id FROM "User" WHERE role = 'STUDENT' LIMIT 1),
    'test-session-001'
  );
ROLLBACK; -- Desfazer teste
```

---

## 📝 Notas

1. **Backup:** Sempre fazer backup antes de aplicar migrations em produção
2. **Downtime:** Estas alterações podem ser feitas sem downtime
3. **Dados existentes:** Usuários existentes terão `activationStatus = 'PENDING_DOCUMENTS'` por padrão
4. **Admins:** Admins e bibliotecários são automaticamente marcados como `ACTIVE`
5. **Certificados:** URLs de certificados serão gerados automaticamente após conclusão de formação

---

## 🚀 Próximos Passos

Após aplicar esta migration:

1. ✅ Reiniciar aplicação Next.js
2. ✅ Testar criação de sessão via API: `POST /api/training/sessions`
3. ✅ Testar inscrição de usuário: `POST /api/training/sessions/[id]/register`
4. ✅ Testar marcação de presença: `PATCH /api/training/sessions/[id]/attendance`
5. ✅ Verificar que usuários ficam com `activationStatus = 'ACTIVE'` após formação
6. ✅ Confirmar que validações de acesso funcionam baseadas em `activationStatus`

---

**Status:** ⏳ PENDENTE DE APLICAÇÃO  
**Ambiente:** Prisma Accelerate (Paris)  
**Banco:** PostgreSQL 15+
