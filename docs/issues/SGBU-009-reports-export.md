# SGBU-009 — Relatórios (export CSV/PDF + filtros)

**Prioridade:** P1

## Objetivo
Implementar RF018/RF019:
- relatórios com filtros
- exportação (CSV primeiro; PDF opcional)

## Estado actual
- Página de relatórios existe, mas precisa endpoints e export real.

## Critérios de aceitação
- [ ] Relatório de empréstimos activos/atrasados.
- [ ] Relatório de livros mais requisitados.
- [ ] Export CSV funcional.

## Tarefas técnicas
- [ ] Criar endpoints `GET /api/reports/...` com Prisma aggregations.
- [ ] Implementar export CSV.
- [ ] (Opcional) PDF via `pdf-lib`/`puppeteer` (avaliar complexidade).

## Branch
`issue/sgbu-009-reports-export`
