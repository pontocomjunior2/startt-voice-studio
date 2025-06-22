# Deploy Completo - Frontend + Backend no EasyPanel

## 🚀 Visão Geral

Este guia descreve como fazer deploy completo da aplicação **PontCom Audio** no EasyPanel, incluindo tanto o **frontend React** quanto o **backend Express** em um único serviço.

## ⚠️ Diferença dos Scripts de Deploy

### Script Anterior (`create-easypanel-zip.bat`)
- ✅ Compila apenas o **backend** (TypeScript → JavaScript)
- ✅ Cria ZIP pequeno (~120KB) apenas com servidor
- ❌ **NÃO inclui frontend compilado**
- ❌ Causa erro "Cannot GET /" em produção

### Script Novo (`create-full-deploy-zip.bat`)
- ✅ Compila **frontend** (React/Vite → arquivos estáticos)
- ✅ Compila **backend** (TypeScript → JavaScript)
- ✅ Cria ZIP completo (~41MB) com aplicação inteira
- ✅ **Resolve erro "Cannot GET /"**
- ✅ Aplicação funciona completamente em produção

## 🛠️ Como Fazer Deploy Completo

### 1. Executar Script de Build Completo

```bash
# Execute o script que compila tudo
.\create-full-deploy-zip.bat
```

**O que o script faz:**

1. **Limpa builds anteriores** (dist/, dist-server/, ZIP antigo)
2. **Compila frontend** com `npm run build` → pasta `dist/`
3. **Compila backend** com `npx tsc` → pasta `dist-server/`
4. **Prepara estrutura** de deploy em pasta temporária
5. **Cria ZIP** `pontocomaudio-deploy-completo.zip`
6. **Limpa arquivos** temporários

### 2. Upload no EasyPanel

1. **Acesse** seu projeto no EasyPanel
2. **Vá em** "Services" → seu serviço
3. **Clique em** "Deploy"
4. **Faça upload** do arquivo `pontocomaudio-deploy-completo.zip`
5. **Configure variáveis** de ambiente (se necessário)
6. **Inicie o deploy**

## 📁 Estrutura do ZIP Completo

```
pontocomaudio-deploy-completo.zip
├── dist/                    # Frontend compilado (React/Vite)
│   ├── index.html          # Página principal
│   ├── assets/             # CSS, JS, imagens otimizadas
│   └── ...                 # Outros arquivos estáticos
├── dist-server/            # Backend compilado (Express)
│   ├── server.js           # Servidor principal
│   └── api/                # Rotas da API
├── package.json            # Dependências de produção
├── Dockerfile              # Configuração Docker
└── .dockerignore           # Arquivos ignorados no build
```

## 🔧 Como Funciona em Produção

### Servidor Unificado
O servidor Express agora serve **duas funções**:

1. **API Backend** (`/api/*`)
   - Rotas de upload de áudio
   - Integração com Supabase
   - Geração de roteiros com IA
   - Webhooks do MercadoPago

2. **Frontend React** (todas as outras rotas)
   - Arquivos estáticos servidos diretamente
   - SPA routing com React Router
   - Fallback para `index.html`

### Fluxo de Requisições

```
Usuário acessa https://seu-dominio.com/login
    ↓
Servidor Express verifica se é rota /api/*
    ↓ (NÃO)
Serve index.html do React
    ↓
React Router gerencia navegação client-side
```

```
Frontend faz POST /api/upload/audio
    ↓
Servidor Express processa upload
    ↓
Retorna resposta JSON para o frontend
```

## 🔧 Configuração Docker

### Dockerfile Atualizado
```dockerfile
FROM node:18-alpine AS builder

# Instalar dumb-init para gerenciamento de processo
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar dependências e instalar
COPY package.json ./
RUN npm install --omit=dev

# Copiar arquivos compilados
COPY dist/ ./dist/
COPY dist-server/ ./dist-server/

# Criar diretórios para uploads
RUN mkdir -p public/uploads temp

# Configurar ambiente
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_UPLOAD_SIZE_MB=200

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist-server/server.js"]
```

## 🔧 Configuração no EasyPanel

### Variáveis de Ambiente Necessárias
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=[SECRET]
SUPABASE_SERVICE_ROLE_KEY=[SECRET]

# APIs Externas
GEMINI_API_KEY=[SECRET]
MP_ACCESS_TOKEN=[SECRET]

# Configurações
PORT=3000
MAX_UPLOAD_SIZE_MB=200
NODE_ENV=production
```

### Volumes Persistentes (Recomendado)
```bash
# Volume para uploads
uploads-storage → /app/public/uploads

# Volume para arquivos temporários
temp-storage → /app/temp
```

## ✅ Verificação Pós-Deploy

### 1. Teste o Frontend
- Acesse `https://seu-dominio.com/`
- Deve carregar a página de login
- Navegue entre páginas (deve funcionar sem erro 404)

### 2. Teste a API
- Acesse `https://seu-dominio.com/api/test-env`
- Deve retornar JSON com configurações

### 3. Teste Upload
- Faça login e teste upload de áudio
- Verifique se arquivos são salvos corretamente

## 🐛 Troubleshooting

### Erro "Cannot GET /"
- **Causa**: Usando script antigo que não inclui frontend
- **Solução**: Use `create-full-deploy-zip.bat`

### Erro 404 em Rotas React
- **Causa**: Servidor não está servindo index.html para rotas SPA
- **Solução**: Verificar se rota catch-all `app.get('*', ...)` está configurada

### Arquivos de Upload Perdidos
- **Causa**: Deploy sem volumes persistentes
- **Solução**: Configurar volumes no EasyPanel

### Build Muito Grande
- **Tamanho atual**: ~41MB (aceitável)
- **Se necessário**: Implementar code-splitting no Vite

## 📊 Comparação de Tamanhos

| Método | Tamanho | Conteúdo | Status |
|--------|---------|----------|--------|
| Script antigo | ~120KB | Apenas backend | ❌ Erro "Cannot GET /" |
| Script novo | ~41MB | Frontend + Backend | ✅ Funciona completamente |

## 🔄 Próximos Deploys

Para deploys futuros, sempre use:

```bash
.\create-full-deploy-zip.bat
```

**Nunca mais use** o script antigo `create-easypanel-zip.bat` pois ele não inclui o frontend compilado.

## 📝 Notas Importantes

1. **Tempo de Build**: O build completo demora mais (~30s) mas garante funcionamento
2. **Tamanho do ZIP**: Maior, mas ainda aceitável para o EasyPanel
3. **Performance**: Servidor único serve frontend e backend eficientemente
4. **Manutenção**: Um único deploy atualiza toda a aplicação

---

**✅ Resultado Final**: Aplicação completa funcionando em produção sem erros "Cannot GET /"! 