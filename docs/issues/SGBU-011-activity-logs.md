# SGBU-011 — ActivityLog / Auditoria

**Prioridade:** P2

## Objetivo
Ter rastreabilidade de acções críticas (conforme checklist do projecto):
- empréstimo
- devolução
- renovação
- reserva
- pagamento/isenção de multa

## Estado actual
- Model `ActivityLog` existe no Prisma (validar uso) mas não é preenchido consistentemente.

## Critérios de aceitação
- [ ] Cada operação crítica cria registo em ActivityLog com userId, tipo, payload mínimo.
- [ ] Logs não expõem dados sensíveis.

## Tarefas técnicas
- [ ] Criar helper `logActivity()`.
- [ ] Integrar nas rotas relevantes.
- [ ] Criar tela admin para consulta (opcional).

## Branch
`issue/sgbu-011-activity-logs`
