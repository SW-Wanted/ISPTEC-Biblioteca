# 📋 FLUXO CORRETO DE EMPRÉSTIMO - SGBU ISPTEC

**Data:** 03 de Fevereiro de 2026  
**Baseado em:** PRD Seção 7.3 - Fluxo de Empréstimo Digital

---

## ✅ FLUXO OFICIAL (Conforme Regulamento)

```
┌──────────────┐
│  ESTUDANTE   │
│  ou DOCENTE  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 1. Consulta disponibilidade no portal │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 2. Faz RESERVA online                 │
│    (NÃO cria empréstimo!)             │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 3. Recebe comprovante de reserva      │
│    (email/SMS/notificação)            │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 4. Sistema marca reserva como         │
│    AVAILABLE (livro disponível)       │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 5. Utilizador COMPARECE à biblioteca  │
│    fisicamente (com comprovante)      │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌──────────────┐
│ FUNCIONÁRIO  │
│  BIBLIOTECA  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│ 6. Funcionário CONFIRMA identidade    │
│    e verifica reserva no sistema      │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 7. Funcionário REGISTRA empréstimo    │
│    no sistema (cria Loan)             │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 8. Sistema define prazo automaticamente│
│    (5 dias estudante, 15 dias docente)│
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 9. Utilizador LEVA o livro fisicamente│
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 10. Sistema envia notificação         │
│     (empréstimo confirmado, due date) │
└────────────────────────────────────────┘
```

---

## 🔐 PERMISSÕES POR TIPO DE UTILIZADOR

### Estudantes e Docentes PODEM:

- ✅ Consultar disponibilidade de livros
- ✅ **RESERVAR** livros online
- ✅ Ver suas reservas e status
- ✅ Cancelar reservas
- ✅ Ver histórico de empréstimos
- ✅ Renovar empréstimos ativos (online)

### Estudantes e Docentes NÃO PODEM:

- ❌ Criar empréstimos diretamente no sistema
- ❌ Aprovar/confirmar empréstimos
- ❌ Registrar devoluções

### Funcionários/Bibliotecários PODEM:

- ✅ Ver lista de reservas AVAILABLE (aguardando levantamento)
- ✅ **APROVAR/CONFIRMAR** reservas e criar empréstimos
- ✅ Registrar devoluções
- ✅ Aplicar multas
- ✅ Bloquear/desbloquear utilizadores
- ✅ Gerenciar todo o acervo

---

## 📱 INTERFACES NECESSÁRIAS

### Para Estudantes/Docentes:

**Página "Detalhes do Livro":**

- Botão: ~~"Emprestar Agora"~~ ❌ (REMOVER)
- Botão: **"Reservar para Levantamento"** ✅
- Botão: "Entrar na Fila de Espera" (se indisponível)

**Página "Minhas Reservas":**

- Lista de reservas com status:
  - ACTIVE (na fila)
  - AVAILABLE (pronto para levantar - 48h)
  - COLLECTED (levantado - empréstimo ativo)
  - EXPIRED (expirado - não levantou)
- Botão: "Cancelar Reserva"

### Para Funcionários/Bibliotecários:

**Nova Página: "Aprovar Empréstimos"** 📋

- Lista de reservas com status AVAILABLE
- Informações mostradas:
  - Nome do estudante/docente
  - Matrícula/Nº colaborador
  - Livro reservado
  - Data da reserva
  - Prazo de levantamento (48h)
- Botões:
  - **"Confirmar Empréstimo"** - Cria Loan, marca como COLLECTED
  - "Expirar Reserva" - Se não levantou no prazo

---

## 🗂️ TABELAS E STATUS

### Tabela `Reservation`

| Status    | Significado                                     | Próximo Passo                    |
| --------- | ----------------------------------------------- | -------------------------------- |
| ACTIVE    | Na fila aguardando                              | Livro devolvido → AVAILABLE      |
| AVAILABLE | Livro disponível, aguardando levantamento (48h) | Utilizador comparece → COLLECTED |
| COLLECTED | Levantado com sucesso                           | Empréstimo criado (Loan)         |
| EXPIRED   | Não levantou em 48h                             | Libera para próximo da fila      |
| CANCELLED | Cancelado pelo utilizador                       | -                                |

### Tabela `Loan`

| Status   | Significado                |
| -------- | -------------------------- |
| ACTIVE   | Empréstimo ativo           |
| OVERDUE  | Atrasado (passou due date) |
| RETURNED | Devolvido                  |

---

## ⚠️ ERROS A CORRIGIR NO CÓDIGO ATUAL

### 1. BookDetailsClient.tsx

```tsx
// ❌ REMOVER: Botão "Emprestar Agora"
// ❌ REMOVER: loanMutation (criação direta de empréstimo)
// ❌ REMOVER: showLoanDialog

// ✅ MANTER: Apenas botão "Reservar"
// ✅ MANTER: reserveMutation
```

### 2. Criar Nova Página: ProcessLoansPage.tsx

```tsx
// Página exclusiva para FUNCIONÁRIOS
// Permissão: role === 'LIBRARIAN' ou 'STAFF'

// Funcionalidades:
// - Listar reservations WHERE status = 'AVAILABLE'
// - Botão "Confirmar Empréstimo" para cada reserva
// - Ao confirmar:
//   1. Criar Loan (com member_id, copy_id, status='active')
//   2. Atualizar Reservation (status='collected')
//   3. Atualizar Copy (status='borrowed')
//   4. Enviar notificação ao utilizador
```

### 3. Atualizar API de Empréstimos

```typescript
// POST /api/entities/Loan
// ✅ Validar: Só LIBRARIAN/STAFF pode criar
// ✅ Validar: Reserva existe e status = AVAILABLE
// ✅ Validar: Cópia disponível
// ✅ Calcular dueDate automaticamente
// ✅ Aplicar regras do Artigo 10º (SGBU-007)
```

---

## 🎯 IMPLEMENTAÇÃO PRIORIZADA

### Fase 1: Correção Urgente (Agora) ⚡

1. ✅ Remover botão "Emprestar Agora" de BookDetailsClient
2. ✅ Remover loanMutation e showLoanDialog
3. ✅ Atualizar mensagem de sucesso da reserva

### Fase 2: Nova Funcionalidade (Próximo) 🚀

1. ⏳ Criar página "Processar Empréstimos" para funcionários
2. ⏳ Implementar lista de reservas AVAILABLE
3. ⏳ Botão "Confirmar Empréstimo"
4. ⏳ Validação de permissões no backend

### Fase 3: Melhorias (Depois) 🎨

1. ⏳ Dashboard de estatísticas para funcionários
2. ⏳ Notificações em tempo real
3. ⏳ Histórico de atividades
4. ⏳ Relatórios de empréstimos processados

---

## 📚 REFERÊNCIAS

- **PRD:** Seção 3.3 (RF007-RF012) - Módulo de Empréstimos
- **PRD:** Seção 7.3 - Fluxo de Empréstimo Digital
- **Regulamento:** Artigo 10º - Limites de empréstimo
- **Issue:** SGBU-007 - Regras de Empréstimo

---

**Última atualização:** 03/02/2026  
**Responsável:** Emanuel Carneiro dos Santos  
**Status:** ✅ Fluxo clarificado e documentado
