# Status

## Done (já resolvido)

- Qualidade: lint sem warnings/erros; build a passar.
- NextAuth dev: corrigido erro de JSON/HTML em requests (CLIENT_FETCH_ERROR) e compatibilidade com Next 16 (searchParams Promise).
- Ratings: removidos ratings “fake” de seed; estrelas só aparecem com reviews reais.
- Permissões: utilizadores autenticados (não-admin) conseguem listar livros; leituras de Member/Loan limitadas ao próprio (self-service).
- BookReview: `upsert` para evitar erro Prisma `P2002` (bookId,userId).
- Copy: endpoint de leitura implementado (acabou 404 em detalhes do livro).- **SGBU-006 (02/02/2026)**: Sistema de reservas FIFO completo implementado e testado
  - ✅ Restrição de leitura (utilizador só vê suas próprias reservas)
  - ✅ Prevenção de reservas duplicadas
  - ✅ Operação de levantamento (COLLECTED)
  - ✅ Notificações automáticas
  - ✅ UI atualizada com botão "Levantar agora"
  - [Ver documentação completa](./SGBU-006-IMPLEMENTATION.md)
- **SGBU-007 (03/02/2026)**: Regras de empréstimo (Artigo 10º) completo implementado
  - ✅ Enums MaterialType e LoanPolicy
  - ✅ Validação: 1 obra por título
  - ✅ Validação: livros de referência não emprestam
  - ✅ Cálculo automático de dueDate por política
  - ✅ Suporte para dias úteis (CD/DVD)
  - ✅ 6 livros de teste com tipos diversos
  - [Ver documentação completa](./SGBU-007-IMPLEMENTATION.md)

## In Progress

- (vazio)

## Backlog

Ver [index.md](./index.md)
