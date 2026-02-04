#!/bin/bash

echo "🔥 RESET COMPLETO DO BANCO DE DADOS"
echo "===================================="
echo ""
echo "⚠️  Este script vai:"
echo "   - Deletar TODOS os livros"
echo "   - Deletar TODOS os empréstimos"
echo "   - Deletar TODOS os utilizadores"
echo "   - Criar apenas 1 administrador"
echo ""

# Executar seed
npx dotenvx run -- tsx prisma/seed.ts

echo ""
echo "✅ Reset completo!"
