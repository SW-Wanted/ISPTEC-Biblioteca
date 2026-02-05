# 🖼️ Configuração do Cloudinary - Upload de Imagens

**Data:** 04 de Fevereiro de 2026  
**Sistema:** SGBU - Biblioteca ISPTEC

---

## 🎯 O que é o Cloudinary?

Cloudinary é um serviço de armazenamento e otimização de imagens na nuvem. Utilizamos para:

- ✅ Armazenar capas de livros
- ✅ Otimização automática (qualidade, formato, tamanho)
- ✅ CDN global (carregamento rápido)
- ✅ **25GB grátis** (suficiente para ~10.000 capas)

---

## 📋 Passo a Passo para Configuração

### 1. Criar Conta Gratuita

1. Acesse: https://cloudinary.com/users/register_free
2. Preencha os dados:
   - **Email:** Use seu email do ISPTEC ou pessoal
   - **Password:** Crie uma senha forte
   - **Cloud name:** Escolha um nome único (ex: `sgbu-isptec`, `biblioteca-isptec`)
3. Confirme o email
4. Faça login: https://console.cloudinary.com/

### 2. Copiar Cloud Name

No **Dashboard** (página inicial após login):

```
┌─────────────────────────────────────┐
│ Cloud name: seu-cloud-name          │  ← COPIE ESTE VALOR
│ API Key: 123456789012345            │
│ API Secret: ••••••••••••••          │
└─────────────────────────────────────┘
```

**Exemplo:** Se aparecer `Cloud name: sgbu-isptec`, copie `sgbu-isptec`.

### 3. Criar Upload Preset (Importante!)

Um "Upload Preset" permite uploads sem autenticação no backend:

1. No menu lateral, clique em **Settings** (⚙️)
2. Vá na aba **Upload**
3. Role até **Upload presets**
4. Clique em **Add upload preset**

Configure:

```yaml
Preset name: sgbu_books_covers
Signing Mode: Unsigned  ← IMPORTANTE!
Folder: books           ← Organiza imagens
Use filename: Yes
Unique filename: Yes
Overwrite: No

Transformations (Otimização automática):
  - Mode: Limit
  - Width: 800
  - Height: 1200
  - Quality: Auto
  - Format: Auto (jpg, png, webp)
```

5. Clique em **Save**
6. **Copie o nome do preset:** `sgbu_books_covers`

### 4. Configurar .env

Abra o arquivo `.env` na raiz do projeto `frontend/`:

```bash
# 🖼️ CLOUDINARY (Upload de Imagens)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="seu-cloud-name"  # Ex: sgbu-isptec
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="sgbu_books_covers"
```

**⚠️ Substitua:**

- `seu-cloud-name` → Valor copiado do Dashboard
- `sgbu_books_covers` → Nome do preset criado

**Exemplo real:**

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="sgbu-isptec"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="sgbu_books_covers"
```

### 5. Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

---

## ✅ Testar Upload

1. Acesse: http://localhost:3000/manage-books
2. Clique em **Adicionar Livro**
3. Na seção **Imagem da Capa**, clique em **Upload de Imagem**
4. Selecione uma imagem (JPG, PNG ou WEBP, máx 5MB)
5. Aguarde o upload
6. ✅ Sucesso: Aparece preview da imagem + toast verde

**Se der erro:**

- Verifique se `.env` tem os valores corretos
- Confirme que o preset está como **Unsigned**
- Veja os logs no console do navegador (F12)

---

## 🔍 Verificar Imagens Enviadas

1. Acesse o Dashboard: https://console.cloudinary.com/
2. Menu lateral → **Media Library**
3. Pasta **books** → Todas as capas enviadas

**Ações disponíveis:**

- Ver URL da imagem
- Editar (crop, resize)
- Deletar imagens não usadas
- Ver estatísticas de uso

---

## 📊 Limites do Plano Gratuito

| Recurso            | Limite                   |
| ------------------ | ------------------------ |
| **Armazenamento**  | 25 GB                    |
| **Bandwidth**      | 25 GB/mês                |
| **Transformações** | 25.000/mês               |
| **Imagens**        | ~10.000 capas (estimado) |

**💡 Dica:** Com otimização automática (`q_auto,f_auto`), cada capa fica ~50-100KB.

---

## 🚨 Troubleshooting

### Erro: `400 Bad Request`

**Causa:** Variáveis de ambiente incorretas ou preset não configurado.

**Solução:**

1. Verifique `.env`:
   ```bash
   echo $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
   echo $NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
   ```
2. Confirme que o preset existe em **Settings → Upload → Upload presets**
3. Verifique que **Signing Mode = Unsigned**

### Erro: `Invalid API Key`

**Causa:** Preset configurado como "Signed" em vez de "Unsigned".

**Solução:** Edite o preset e mude para **Unsigned**.

### Upload lento

**Causa:** Imagem muito grande.

**Solução:**

- Redimensione imagem antes do upload (máx 1200x1800px)
- Use formato WEBP ou JPG (evite PNG pesado)

### Imagem não aparece após upload

**Causa:** CORS ou URL inválida.

**Solução:**

1. Verifique se a URL retornada começa com `https://res.cloudinary.com/`
2. Teste a URL diretamente no navegador
3. Verifique se `cover_url` foi salvo no banco de dados

---

## 🔐 Segurança

### ✅ Boas Práticas Implementadas

1. **Unsigned Upload:** Não expõe API Key/Secret no frontend
2. **Validação de Tipo:** Apenas imagens (JPG, PNG, WEBP)
3. **Limite de Tamanho:** Máximo 5MB por arquivo
4. **Pasta Dedicada:** Todas as capas em `/books`
5. **Otimização Automática:** Reduz tamanho sem perder qualidade

### ⚠️ Não Fazer

- ❌ Não commit `.env` no Git
- ❌ Não compartilhe API Secret publicamente
- ❌ Não use preset "Signed" para uploads do frontend

---

## 🎨 Otimizações Avançadas (Opcional)

### Transformações na URL

Cloudinary permite transformar imagens na URL:

```
Original:
https://res.cloudinary.com/sgbu-isptec/image/upload/books/livro123.jpg

Redimensionado (300x450):
https://res.cloudinary.com/sgbu-isptec/image/upload/w_300,h_450,c_fill/books/livro123.jpg

Qualidade 80% + WEBP:
https://res.cloudinary.com/sgbu-isptec/image/upload/q_80,f_webp/books/livro123.jpg

Múltiplas transformações:
https://res.cloudinary.com/sgbu-isptec/image/upload/w_300,h_450,c_fill,q_80,f_auto/books/livro123.jpg
```

**Parâmetros úteis:**

- `w_` / `h_` - Largura/altura
- `c_fill` - Crop e preenche
- `c_limit` - Redimensiona mantendo proporção
- `q_auto` - Qualidade automática
- `f_auto` - Formato automático (WEBP quando possível)

### Implementar no Next.js Image

```tsx
<Image
  src={book.cover_url}
  alt={book.title}
  width={200}
  height={300}
  loader={({ src, width }) => {
    // Adicionar transformações Cloudinary
    return src.replace("/upload/", `/upload/w_${width},c_limit,q_auto,f_auto/`);
  }}
/>
```

---

## 📚 Recursos

- **Dashboard:** https://console.cloudinary.com/
- **Documentação:** https://cloudinary.com/documentation/image_upload_api_reference
- **Playground:** https://cloudinary.com/documentation/transformation_playground
- **Suporte:** https://support.cloudinary.com/

---

## ✅ Checklist Final

Antes de fazer commit:

- [ ] `.env` configurado com valores reais
- [ ] Upload preset criado como **Unsigned**
- [ ] Testado upload de imagem com sucesso
- [ ] Preview da imagem aparece no formulário
- [ ] `.env` **NÃO** está no Git (verificar `.gitignore`)
- [ ] `.env.example` documentado para a equipe

---

**🎉 Pronto! O upload de imagens está configurado.**

Se tiver dúvidas, consulte a equipe ou abra uma issue no repositório.
