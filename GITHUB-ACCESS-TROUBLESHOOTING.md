# 🔒 Resolução de Problemas - Acesso GitHub Privado no EasyPanel

## Problema Comum: "Não Funciona" / Erro de Acesso

### ✅ **Soluções Passo a Passo:**

---

## **Opção 1: Tornar Repositório Público (Temporariamente)**

### Passo a Passo:
1. **Vá para GitHub**: https://github.com/pontocomjunior2/startt
2. **Settings** → **General** 
3. **Danger Zone** → **Change repository visibility**
4. **Make public**
5. **Configure no EasyPanel** (com os campos que mostrei)
6. **Após deploy bem-sucedido**, torne privado novamente

---

## **Opção 2: Conectar GitHub App no EasyPanel**

### Passo a Passo:
1. **No EasyPanel**, clique em **"Connect GitHub"** ou **"Authorize GitHub"**
2. **Autorize todas as permissões** solicitadas
3. **Conceda acesso específico** ao repositório `pontocomjunior2/startt`
4. **Se não aparecer na lista**, revogue e reconecte

---

## **Opção 3: Personal Access Token**

### Criar Token:
1. **GitHub** → **Settings** → **Developer settings** → **Personal access tokens**
2. **Generate new token (classic)**
3. **Permissões necessárias**:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
4. **Copie o token gerado**

### Usar no EasyPanel:
1. **Procure por "Access Token"** ou **"GitHub Token"** no EasyPanel
2. **Cole o token**
3. **Teste a conexão**

---

## **Opção 4: Deploy Key (Mais Específico)**

### Se as opções acima não funcionarem:
1. **EasyPanel** → **Procure por "Deploy Keys"**
2. **Gere uma SSH key**
3. **Adicione no GitHub**: Settings → Deploy keys → Add deploy key
4. **Cole a chave pública** gerada pelo EasyPanel

---

## 🚀 **Configurações Exatas para EasyPanel:**

```yaml
# Campos obrigatórios:
Proprietário: pontocomjunior2
Repositório: startt
Branch: feat/visual-template-integration
Caminho de Build: /

# Método de Build:
Tipo: Dockerfile
Arquivo: Dockerfile

# Comandos (automáticos via Dockerfile):
Build Command: (será lido do Dockerfile)
Start Command: (será lido do Dockerfile)
```

---

## 🔧 **Variáveis de Ambiente (Adicionar DEPOIS):**

Após conseguir conectar o repositório, adicione estas variáveis:

```env
VITE_SUPABASE_URL=https://wyhqnplylkonevbdvtnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwODc4OTUsImV4cCI6MjA2MjY2Mzg5NX0.NKJgyjqWmtZcEmP05G2wFGElsTlZXdhjL2b-nPiqUEU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4Nzg5NSwiZXhwIjoyMDYyNjYzODk1fQ.8fjCst6v96NoaSPfpllxunqKd4IBMN3NdaroieDWFoE
VITE_DOWNLOAD_PROXY_URL=https://wyhqnplylkonevbdvtnk.supabase.co/functions/v1/download-proxy
VITE_API_URL=https://startt.pontocomaudio.net/api
VITE_ADMIN_SECRET=Conquista@@2
GEMINI_API_KEY=AIzaSyDFKkP35AfR2xU8dd9uYgYG-vHQJEjNTgI
GEMINI_MODEL=gemini-2.5-flash-preview-05-20
MP_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=4096
NODE_ENV=production
PORT=3000
```

---

## 🎯 **Recomendação:**

**COMECE COM A OPÇÃO 1** (tornar público temporariamente) - é a mais simples e rápida para testar se o deploy funciona. Depois que confirmar que está tudo funcionando, torne o repositório privado novamente e configure o acesso adequado. 