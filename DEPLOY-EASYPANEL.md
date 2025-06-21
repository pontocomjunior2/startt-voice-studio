# Deploy no EasyPanel - Guia Completo

## ⚠️ IMPORTANTE: O que o script `create-easypanel-zip.bat` faz

**O script `create-easypanel-zip.bat` APENAS:**
- ✅ Compila o código TypeScript do **BACKEND** (`server/` → `dist-server/`)
- ✅ Cria um ZIP com o backend compilado para deploy no EasyPanel
- ✅ Inclui Dockerfile, package.json e dependências do servidor

**O script NÃO:**
- ❌ **NÃO afeta o frontend em desenvolvimento**
- ❌ **NÃO compila o frontend (Vite/React)**
- ❌ **NÃO para o servidor de desenvolvimento**
- ❌ **NÃO modifica arquivos do frontend**

**Se o site ficou inacessível após executar o script:**
- O problema não foi causado pelo script
- Provavelmente o servidor de desenvolvimento parou por outro motivo
- **Solução:** Execute `npm run dev` para reiniciar ambos os servidores

---

## 🚀 Como fazer Deploy no EasyPanel

### Pré-requisitos
- Conta no EasyPanel
- Projeto configurado no EasyPanel
- Variáveis de ambiente preparadas

### Passo 1: Gerar ZIP de Deploy

Execute o script de deploy:

```bash
# Opção 1: Script .bat (Windows)
.\create-easypanel-zip.bat

# Opção 2: Script PowerShell (Windows)
.\create-easypanel-zip.ps1
```

**Saída esperada:**
- Arquivo: `pontocomaudio-easypanel.zip` (~120KB)
- Conteúdo: Backend compilado + Dockerfile + dependências

### Passo 2: Upload no EasyPanel

1. **Acesse o EasyPanel**
2. **Vá para seu projeto**
3. **Na aba "Source" (Origem):**
   - Selecione **"Upload"**
   - Faça upload do arquivo `pontocomaudio-easypanel.zip`

### Passo 3: Configurar Volumes Persistentes

**⚠️ CRÍTICO: Configure volumes ANTES do primeiro deploy**

Na seção **"Volumes"** do EasyPanel:

```
Volume 1:
- Nome: uploads-storage
- Mount Path: /app/public/uploads
- Tipo: Volume

Volume 2:
- Nome: temp-storage  
- Mount Path: /app/temp
- Tipo: Volume
```

**Por que volumes são importantes:**
- 🏠 **Armazenamento local persistente**
- 💾 **Arquivos nunca são perdidos entre deploys**
- 💰 **Sem custos extras**
- 🚀 **Performance otimizada**

### Passo 4: Configurar Variáveis de Ambiente

Na seção **"Environment"** do EasyPanel:

```bash
# Supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# APIs Externas
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-2.5-flash-preview-05-20
MERCADOPAGO_ACCESS_TOKEN=sua_chave_mp

# Configurações do Servidor
PORT=3000
NODE_ENV=production
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=1024

# URLs (ajuste conforme seu domínio)
FRONTEND_URL=https://seu-dominio.com
API_URL=https://seu-dominio.com
```

### Passo 5: Deploy

1. **Clique em "Deploy"**
2. **Aguarde o build completar** (~2-3 minutos)
3. **Verifique os logs** para confirmar que subiu corretamente

---

## 🔄 Próximos Deploys

Para atualizações futuras:

```bash
# 1. Execute o script de deploy
.\create-easypanel-zip.bat

# 2. No EasyPanel, vá em "Source" → "Upload"
# 3. Faça upload do novo pontocomaudio-easypanel.zip
# 4. Clique em "Deploy"
```

**✅ Volumes persistentes mantêm todos os arquivos**
**✅ Configurações são preservadas**
**✅ Zero downtime na atualização**

---

## 🐛 Troubleshooting

### Site inacessível após executar script
```bash
# O script não afeta o desenvolvimento local
# Reinicie o servidor de desenvolvimento:
npm run dev
```

### Build falha no EasyPanel
- Verifique se todas as variáveis de ambiente estão configuradas
- Confirme que o ZIP foi criado corretamente (~120KB)
- Verifique os logs do build no EasyPanel

### Arquivos de upload perdidos
- Confirme que os volumes persistentes estão configurados
- Volumes devem ser criados ANTES do primeiro deploy

### Erro 413 (File too large)
- Confirme `MAX_UPLOAD_SIZE_MB=200` nas variáveis de ambiente
- O sistema tem fallback automático para upload em chunks

---

## 📁 Estrutura do Deploy

```
pontocomaudio-easypanel.zip
├── Dockerfile              # Configuração Docker
├── .dockerignore           # Arquivos ignorados no build
├── package.json            # Dependências de produção
├── package-lock.json       # Lock de dependências
└── dist-server/            # Backend compilado
    ├── server.js           # Servidor principal
    ├── server.js.map       # Source map
    └── api/                # APIs compiladas
        ├── gerar-roteiro-ia.js
        ├── gerar-pagamento-pix-mp.js
        └── webhook-mp-pagamentos.js
```

---

## 📞 Suporte

Em caso de problemas:
1. Verifique este guia primeiro
2. Confirme que o desenvolvimento local funciona (`npm run dev`)
3. Verifique logs do EasyPanel
4. Confirme variáveis de ambiente

**Lembre-se:** O script de deploy não afeta o desenvolvimento local! 