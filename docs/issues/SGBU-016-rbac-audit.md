# SGBU-016 — Auditoria de RBAC nas rotas genéricas

**Prioridade:** P1

## Objetivo
Garantir que nenhum endpoint permite acesso indevido a dados de outros utilizadores.

## Estado actual (riscos)
- `GET Reservation` não restringe por utilizador (pode vazar dados).
- Alguns ecrãs enviam `user_id` arbitrário no client; o server deve ignorar/validar.

## Critérios de aceitação
- [ ] Para cada entidade sensível (`Loan`, `Reservation`, `Fine`, `Notification`, `LockerRental`, `ComputerSession`):
  - [ ] utilizador normal só consegue ver o próprio
  - [ ] staff tem acesso conforme papel
- [ ] Testes cobrindo pelo menos 2 casos de acesso indevido.

## Tarefas técnicas
- [ ] Revisar `GET`/`POST`/`PATCH`/`DELETE` em:
  - [3_Construcao/frontend/src/app/api/entities/[entity]/route.ts](../3_Construcao/frontend/src/app/api/entities/[entity]/route.ts)
  - [3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts](../3_Construcao/frontend/src/app/api/entities/[entity]/[id]/route.ts)
- [ ] Ajustar verificações e filtros.
- [ ] Adicionar testes.

## Branch
`issue/sgbu-016-rbac-audit`
