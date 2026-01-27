# SGBU-001 — Renovação de empréstimo (API + UI)

**Prioridade:** P0

## Objetivo
Implementar renovação de empréstimos conforme **Artigo 15º / RF013-RF014**.

## Estado actual
- UI em [3_Construcao/frontend/src/app/my-loans/page.tsx](../3_Construcao/frontend/src/app/my-loans/page.tsx) tenta renovar via `api.entities.Loan.update(..., { renewal_count: ... })`.
- Backend em [3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts](../3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts) **não** suporta renovação (só suporta `status=RETURNED`).

## Critérios de aceitação
- [ ] Utilizador consegue renovar um empréstimo activo até 2x.
- [ ] Renovação falha com mensagem clara quando:
  - [ ] já atingiu limite (`maxRenewals`)
  - [ ] existe reserva pendente para o livro
  - [ ] utilizador tem multas pendentes
  - [ ] empréstimo não está activo
- [ ] `dueDate` é recalculado com base no tipo de utilizador (5 dias estudante, 15 dias docente).
- [ ] Regista notificação (IN_APP) de sucesso/recusa.

## Tarefas técnicas
- [ ] Criar endpoint dedicado (recomendado): `POST /api/loans/{id}/renew` (ou alternativa consistente no generic entities).
- [ ] Implementar lógica de negócio em transaction Prisma.
- [ ] Ajustar UI `MyLoans` para chamar o endpoint real.
- [ ] Ajustar `apiClient` (se necessário) para suportar rota dedicada.
- [ ] Adicionar testes (unit/integration) para regras de renovação.

## Branch
`issue/sgbu-001-loan-renewal`

## Plano de testes
- Renovar 3x: as 2 primeiras passam, a 3ª falha.
- Criar reserva de outro utilizador para o mesmo livro e tentar renovar: deve falhar.
- Criar multa pendente e tentar renovar: deve falhar.
