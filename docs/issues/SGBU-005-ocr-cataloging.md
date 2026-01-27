# SGBU-005 — OCR + enriquecimento + classificação

**Prioridade:** P1

## Objetivo
Implementar RF004/RF005/RF006:
- OCR (capa/folha de rosto)
- enriquecimento (Google Books)
- sugestão de categoria
- workflow Catalogador → Supervisor

## Estado actual
- Existe model `CatalogEntry` no Prisma, mas falta pipeline completo.
- `InvokeLLM` em [3_Construcao/frontend/src/api/apiClient.ts](../3_Construcao/frontend/src/api/apiClient.ts) está em “modo offline”.
- UI de catalogação existe em [3_Construcao/frontend/src/app/cataloging/page.tsx](../3_Construcao/frontend/src/app/cataloging/page.tsx) mas precisa ligar ao backend real.

## Critérios de aceitação
- [ ] Criar `CatalogEntry` com imagem enviada.
- [ ] Extrair título/autor/ISBN/editora/ano (OCR) e guardar.
- [ ] Enriquecer via Google Books quando houver ISBN.
- [ ] Aprovação altera status para APPROVED e cria/actualiza Book + Copies.

## Tarefas técnicas
- [ ] Implementar rota(s): `POST /api/cataloging/entries`, `POST /api/cataloging/entries/{id}/approve`.
- [ ] Integrar OCR (Tesseract.js) no server.
- [ ] Integrar Google Books API (com `GOOGLE_BOOKS_API_KEY` opcional).
- [ ] Implementar RBAC (CATALOGER cria, SUPERVISOR aprova).

## Branch
`issue/sgbu-005-ocr-cataloging`
