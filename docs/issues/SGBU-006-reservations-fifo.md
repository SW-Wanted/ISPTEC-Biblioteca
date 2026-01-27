# SGBU-006 — Reservas FIFO (fluxo completo)

**Prioridade:** P1

## Objetivo
Completar RF015/RF016:
- FIFO
- posição na fila
- 48h para levantamento
- cancelar
- impedir duplicados (mesmo utilizador reservar o mesmo livro mais de uma vez)

## Estado actual
- Backend cria reserva e expira `AVAILABLE` (48h) parcialmente.
- Falta:
  - restrição de leitura (hoje `GET Reservation` não limita por utilizador)
  - operação de levantamento/collect
  - impedir duplicados

## Critérios de aceitação
- [ ] Utilizador vê apenas as próprias reservas.
- [ ] Não consegue reservar o mesmo livro 2x em paralelo.
- [ ] Quando livro fica disponível, a reserva muda para AVAILABLE e expira em 48h.
- [ ] Levantamento marca `COLLECTED` e ajusta copy/book counters.

## Tarefas técnicas
- [ ] Ajustar autorização em `GET Reservation` no backend.
- [ ] Implementar `PATCH Reservation` para `COLLECTED` (com `collectionDate`).
- [ ] Impedir duplicados (unique lógica por `bookId,userId` para status ACTIVE/AVAILABLE).
- [ ] Criar notificação no acto de disponibilidade e no levantamento.

## Branch
`issue/sgbu-006-reservations-fifo`
