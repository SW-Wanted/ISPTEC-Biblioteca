# SGBU-003 — Notificações (centro + contagem + actions)

**Prioridade:** P0

## Objetivo
Tornar notificações “reais” e consistentes com RF010/RF015:
- contagem de não lidas no header
- actions (ex: renovar, levantar reserva, pagar multa)
- marcar como lida

## Estado actual
- Header em [3_Construcao/frontend/src/components/app-shell.tsx](../3_Construcao/frontend/src/components/app-shell.tsx) tem `unreadCount = 0` (TODO).
- Página [3_Construcao/frontend/src/app/notifications/page.tsx](../3_Construcao/frontend/src/app/notifications/page.tsx) espera campos como `action_type`, mas API actual retorna apenas `title/message/status/type`.
- `subscribe()` no [3_Construcao/frontend/src/api/apiClient.ts](../3_Construcao/frontend/src/api/apiClient.ts) é polling (refetch) — ok como fallback.

## Critérios de aceitação
- [ ] Header mostra número correcto de notificações não lidas.
- [ ] Notificação suporta deep-link para o contexto (loan/reservation/fine) de forma consistente.
- [ ] Marcar como lida funciona e actualiza UI.

## Tarefas técnicas
- [ ] Padronizar “shape” de Notification no backend (derivar `action_type` a partir de `loanId/reservationId` OU adicionar campo no schema).
- [ ] Implementar endpoint “unread count” ou devolver contagem junto do list.
- [ ] Ajustar UI para usar campos suportados.
- [ ] Garantir autorização: utilizador só vê/actualiza as próprias notificações.

## Branch
`issue/sgbu-003-notifications-center`
