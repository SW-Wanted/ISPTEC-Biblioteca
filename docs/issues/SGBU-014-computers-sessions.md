# SGBU-014 — Computadores: sessões, fila e renovação (Artigo 17º)

**Prioridade:** P2

## Objetivo
Implementar RF022:
- sessão 2h por utilizador
- renovação +2h se não houver fila
- check-in no balcão

## Estado actual
- Backend permite marcar `Computer` como `OCCUPIED` e cria `ComputerSession`, mas UI envia campos não suportados.
- Falta fila/renovação e regras de renovação.

## Critérios de aceitação
- [ ] Reservar computador cria `ComputerSession` com `expectedEnd`.
- [ ] Renovação estende sessão se não houver fila.
- [ ] Libertação actualiza `Computer` e encerra sessão.

## Tarefas técnicas
- [ ] Criar endpoints: `POST /api/computers/{id}/reserve`, `POST /api/computers/{id}/release`, `POST /api/computers/{id}/renew`.
- [ ] Ajustar UI para usar rotas reais.
- [ ] (Opcional) Implementar fila (modelo + queries) se necessário.

## Branch
`issue/sgbu-014-computers-sessions`
