# SGBU-010 — Recomendações

**Prioridade:** P2  
**Status:** ✅ CONCLUÍDO

## Objetivo
Implementar RF026:
- recomendações com base em histórico (loans)
- similares por categoria

## Estado actual
✅ **IMPLEMENTADO COMPLETAMENTE**
- Serviço de recomendações: `lib/recommendations.ts`
- Endpoint API: `GET /api/recommendations`
- UI integrada: `app/recommendations/page.tsx`
- Testes: `lib/__tests__/recommendations.test.ts`
- Documentação: `docs/issues/SGBU-010-IMPLEMENTATION.md`

## Critérios de aceitação
- [x] ✅ Utilizador vê recomendações personalizadas (mínimo 5).
- [x] ✅ Não recomendar livros já lidos.

## Tarefas técnicas
- [x] ✅ Implementar serviço `getRecommendations(userId)` no server.
- [x] ✅ Guardar recomendações calculadas (opcional) em `BookRecommendation`.
- [x] ✅ Expor endpoint `GET /api/recommendations`.

## Branch
`issue/sgbu-010-recommendations` (✅ Merged)

## Pull Request
#57 - https://github.com/SW-Wanted/biblioteca-universitaria/pull/57

## Implementação
- Algoritmo híbrido (content-based 60% + collaborative 30% + disponibilidade 10%)
- Scoring: categoria (40%), autor (30%), popularidade (20%), disponibilidade (10%)
- Cache em `BookRecommendation` model
- Fallback para livros populares sem histórico
- Testes unitários completos com Vitest

## Data de Conclusão
05 de Fevereiro de 2026
