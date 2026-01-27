# SGBU-013 — Cacifos: reserva, expiração e multa (Artigo 5º)

**Prioridade:** P2

## Objetivo
Implementar RF021:
- reserva por 3h (renovável)
- expiração/libertação
- multa por hora extra

## Estado actual
- Backend permite marcar `Locker` como `OCCUPIED` e cria `LockerRental`, mas não há:
  - libertação automática
  - cálculo de multa `LOCKER_OVERTIME`
  - renovação
- UI em [3_Construcao/frontend/src/app/services/page.tsx](../3_Construcao/frontend/src/app/services/page.tsx) chama campos que não existem no backend (`current_user_id`, `expected_end`).

## Critérios de aceitação
- [ ] Reservar cacifo cria `LockerRental` com `expectedEnd`.
- [ ] Ao ultrapassar `expectedEnd`, gerar multa por hora extra.
- [ ] Libertar cacifo marca `Locker` como `AVAILABLE`.

## Tarefas técnicas
- [ ] Alinhar payload UI ↔ API (usar `LockerRental` como fonte de verdade).
- [ ] Criar endpoints dedicados: `POST /api/lockers/{id}/reserve`, `POST /api/lockers/{id}/release`, `POST /api/lockers/{id}/renew`.
- [ ] Implementar job/cron (ou sync on read) para detectar overtime e gerar `Fine`.

## Branch
`issue/sgbu-013-lockers-overtime`
