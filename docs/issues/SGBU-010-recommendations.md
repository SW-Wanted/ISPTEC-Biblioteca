# SGBU-010 — Recomendações

**Prioridade:** P2

## Objetivo
Implementar RF026:
- recomendações com base em histórico (loans)
- similares por categoria

## Estado actual
- UI existe em [3_Construcao/frontend/src/app/recommendations/page.tsx](../3_Construcao/frontend/src/app/recommendations/page.tsx) (validar integração).
- Model `BookRecommendation` existe no Prisma.

## Critérios de aceitação
- [ ] Utilizador vê recomendações personalizadas (mínimo 5).
- [ ] Não recomendar livros já lidos.

## Tarefas técnicas
- [ ] Implementar serviço `getRecommendations(userId)` no server.
- [ ] Guardar recomendações calculadas (opcional) em `BookRecommendation`.
- [ ] Expor endpoint `GET /api/recommendations`.

## Branch
`issue/sgbu-010-recommendations`
