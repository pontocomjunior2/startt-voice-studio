# 🚀 Deploy via GitHub no EasyPanel

## Vantagens do Deploy via GitHub ✅

- ✅ **Mais confiável** que upload de ZIP
- ✅ **Build automático** no servidor
- ✅ **CI/CD integrado**
- ✅ **Histórico de deploys** via commits
- ✅ **Rollback fácil** para commits anteriores
- ✅ **Sem limite de tamanho** de arquivo

---

## 📋 Configuração Passo a Passo

### 1. Preparar Repositório GitHub

**Status Atual**: ✅ **PRONTO**
- Repositório: `pontocomjunior2/startt`
- Branch: `feat/visual-template-integration`
- Último commit: `75c7a58` (deploy guide)
- **Todos os arquivos commitados e sincronizados**

### 2. Conectar Repositório Privado no EasyPanel

#### A. Acessar EasyPanel
1. Entre no seu painel EasyPanel
2. Vá em **"Create New Service"** ou **"Deploy"**

#### B. Escolher GitHub como Fonte
1. Selecione **"Deploy from Git Repository"**
2. Clique em **"Connect GitHub Account"** (se ainda não conectou)

#### C. Autorizar Acesso ao Repositório Privado
1. O GitHub solicitará permissões
2. **Conceda acesso ao repositório privado** `pontocomjunior2/startt`
3. Ou use **GitHub App** para acesso mais seguro

#### D. Configurar o Repositório
```
Repository: pontocomjunior2/startt
Branch: feat/visual-template-integration
Build Command: npm run build && npm run build:server
Start Command: node dist-server/server.js
Port: 3000
```

### 3. Configurar Variáveis de Ambiente

No EasyPanel, adicione estas variáveis:

```env
# Supabase
VITE_SUPABASE_URL=https://wyhqnplylkonevbdvtnk.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_AQUI
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@db.wyhqnplylkonevbdvtnk.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:SUA_SENHA_AQUI@db.wyhqnplylkonevbdvtnk.supabase.co:5432/postgres"

# Download Proxy
VITE_DOWNLOAD_PROXY_URL=https://wyhqnplylkonevbdvtnk.supabase.co/functions/v1/download-proxy

# API
VITE_API_URL=https://startt.pontocomaudio.net/api
VITE_ADMIN_SECRET=SEU_SEGREDO_DE_ADMIN_AQUI

# IA/Gemini
GEMINI_API_KEY=SUA_CHAVE_API_GEMINI_AQUI
GEMINI_MODEL=gemini-2.5-flash-preview-05-20

# Mercado Pago
MP_ACCESS_TOKEN=SEU_ACCESS_TOKEN_MP_AQUI
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos

# Sistema
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=4096
NODE_ENV=production
PORT=3000
```

### 4. Configurar Docker (Dockerfile já está pronto)

O EasyPanel usará automaticamente o `Dockerfile` na raiz do projeto.

**Dockerfile ativo**: O arquivo principal com debug verbose que criamos.

---

## 🔧 Configurações Específicas do EasyPanel

### Build Settings:
```yaml
Build Command: npm ci && npm run build && npm run build:server
Start Command: node dist-server/server.js
Port: 3000
Build Context: /
Dockerfile Path: ./Dockerfile
```

### Auto Deploy:
- ✅ **Ative "Auto Deploy"** para deploy automático a cada push
- **Branch**: `feat/visual-template-integration`

---

## 🚨 Dicas Importantes

### 1. Acesso ao Repositório Privado
- **Método 1**: OAuth do GitHub (mais simples)
- **Método 2**: GitHub App (mais seguro)
- **Método 3**: Deploy Key (mais específico)

### 2. Se der Erro de Acesso:
1. Vá em GitHub → Settings → Applications → Authorized OAuth Apps
2. Revogue e reconecte o EasyPanel
3. Ou use Personal Access Token

### 3. Dockerfile a Usar:
- **Use o `Dockerfile` principal** (não o minimal)
- O build será feito no servidor do EasyPanel
- Os tipos TypeScript deveriam funcionar melhor no ambiente do GitHub

---

## 📊 Comparação: GitHub vs ZIP

| Aspecto | Deploy GitHub | Deploy ZIP |
|---------|---------------|------------|
| **Confiabilidade** | ✅ Alta | ❌ Problemas |
| **Facilidade** | ✅ Automático | ❌ Manual |
| **Rollback** | ✅ Fácil | ❌ Difícil |
| **CI/CD** | ✅ Integrado | ❌ Não |
| **Debug** | ✅ Logs detalhados | ❌ Limitado |

---

## 🎯 Próximos Passos

1. **Acesse o EasyPanel**
2. **Conecte o GitHub** (autorize repositório privado)
3. **Configure as variáveis** de ambiente
4. **Inicie o deploy**
5. **Monitore os logs** de build

---

## 🔍 Troubleshooting

### Se der erro de acesso ao repositório:
```bash
# Verificar se está público (temporariamente)
# Ou usar GitHub Token no EasyPanel
```

### Se der erro de build:
- Os logs do EasyPanel serão mais detalhados que ZIP
- O ambiente de build é diferente e pode resolver os problemas de TypeScript

---

## ✅ Status

**REPOSITÓRIO PRONTO PARA DEPLOY VIA GITHUB!**

Todo o código está commitado, sincronizado e otimizado para deploy automático via GitHub no EasyPanel. 