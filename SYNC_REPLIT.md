# Como Sincronizar com Replit

## Processo de Sincronização

### 1. Após fazer mudanças e aprovar:

```bash
# 1. Verificar o que foi alterado
git status

# 2. Adicionar os arquivos modificados
git add .

# 3. Fazer commit
git commit -m "descrição das mudanças"

# 4. Fazer push para o GitHub
git push origin main
```

### 2. No Replit:

**Opção A - Pull Manual:**
```bash
# No terminal do Replit
git pull origin main
```

**Opção B - Pull Automático (Recomendado):**
1. No Replit, vá em **Tools** → **Git**
2. Configure para fazer pull automático quando houver mudanças
3. Ou configure um webhook do GitHub para notificar o Replit

**Opção C - Reset e Pull (se houver conflitos):**
```bash
# CUIDADO: Isso vai sobrescrever mudanças locais no Replit
git fetch origin
git reset --hard origin/main
```

## ⚠️ Importante

- **Sempre faça commit e push das mudanças aprovadas**
- **No Replit, faça pull antes de trabalhar** para ter a versão mais recente
- **Se houver conflitos**, resolva manualmente ou use `git reset --hard origin/main` (cuidado: perde mudanças locais)

## Repositório Atual

- **GitHub:** `https://github.com/agencianookweb-hash/Nooklead.git`
- **Branch:** `main`

## Variáveis de Ambiente

Lembre-se de configurar no Replit:
- `GROQ_API_KEY` (já salvo no .env local)
- `DATABASE_URL` (se necessário)
- `SESSION_SECRET` (se necessário)
