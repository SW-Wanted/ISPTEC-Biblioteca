# Workflow (Issues + Branches)

## 1) Uma branch por issue

- Criar branch:

```bash
git checkout main
git pull
git checkout -b issue/sgbu-###-slug
```

- Regras:
  - 1 branch = 1 issue
  - PR deve referenciar o ID (ex: `SGBU-003`)
  - Evitar misturar refactors grandes com feature

## 2) Checklist de PR

- [ ] Critérios de aceitação cumpridos
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Seeds/migrations não partem ambiente partilhado
- [ ] Validação Zod nas rotas
- [ ] Autorização (RBAC) consistente
- [ ] Logs sem dados sensíveis
- [ ] Docs actualizada (pelo menos a issue + README se necessário)

## 3) Convenções

- **Branches:** `issue/sgbu-###-slug`
- **Commits:** Conventional Commits (ex: `feat(loans): implement loan renewal`)
- **PR Title:** `SGBU-###: Título curto`

## 4) Estados

- Backlog → In Progress → Done
- A fonte de verdade do backlog está em [docs/issues](./issues/README.md)
