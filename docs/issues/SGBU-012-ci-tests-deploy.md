# SGBU-012 — CI + Testes + Deploy docs

**Prioridade:** P2

## Objetivo
Fortalecer robustez (comparável a plataformas tipo Base44):
- pipeline CI
- testes (unit + e2e)
- documentação de deploy

## Estado actual
- Não há workflows CI em `.github/workflows`.
- Não há Playwright/Jest/Vitest configurado (confirmar).

## Critérios de aceitação
- [ ] CI roda `npm ci`, `npm run lint`, `npm run build` no frontend.
- [ ] Pelo menos 1 teste e2e crítico (login + listar livros).
- [ ] docs de deploy (Vercel/Railway) actualizadas.

## Tarefas técnicas
- [ ] Criar `.github/workflows/ci.yml`.
- [ ] Adicionar Playwright (ou Vitest) e pelo menos 2-3 testes.
- [ ] Documentar deploy e variáveis `.env`.

## Branch
`issue/sgbu-012-ci-tests-deploy`
