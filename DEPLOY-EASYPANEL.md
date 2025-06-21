# Deploy no EasyPanel

## 📋 Pré-requisitos

1. ✅ Conta no EasyPanel configurada
2. ✅ Servidor com Docker instalado
3. ✅ Projeto compilado (`dist-server/` criado)

## 🚀 Passos para Deploy

### 1. Compilar o Projeto

Execute o script de build:
```bash
build-for-easypanel.bat
```

Este script irá:
- Compilar o TypeScript para `dist-server/`
- Copiar `Dockerfile.correto` para `Dockerfile`
- Preparar todos os arquivos necessários

### 2. Configurar no EasyPanel

#### Método 1: Git Repository (Recomendado)
1. Faça push do código para seu repositório Git
2. No EasyPanel, crie uma nova aplicação
3. Selecione "Git Repository"
4. Configure o repositório e branch
5. O EasyPanel detectará automaticamente o `Dockerfile`

#### Método 2: Upload Manual
1. Compacte os arquivos necessários:
   - `Dockerfile`
   - `.dockerignore`
   - `dist-server/`
   - `package.json`
2. Faça upload no EasyPanel

### 3. Configurar Variáveis de Ambiente

No EasyPanel, adicione as seguintes variáveis de ambiente:

```env
# Supabase
VITE_SUPABASE_URL=https://wyhqnplylkonevbdvtnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwODc4OTUsImV4cCI6MjA2MjY2Mzg5NX0.NKJgyjqWmtZcEmP05G2wFGElsTlZXdhjL2b-nPiqUEU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4Nzg5NSwiZXhwIjoyMDYyNjYzODk1fQ.8fjCst6v96NoaSPfpllxunqKd4IBMN3NdaroieDWFoE

# URLs e APIs
VITE_DOWNLOAD_PROXY_URL=https://wyhqnplylkonevbdvtnk.supabase.co/functions/v1/download-proxy
VITE_API_URL=https://startt.pontocomaudio.net/api
VITE_ADMIN_SECRET=Conquista@@2

# Gemini AI
GEMINI_API_KEY=AIzaSyDFKkP35AfR2xU8dd9uYgYG-vHQJEjNTgI
GEMINI_MODEL=gemini-2.5-flash-preview-05-20

# MercadoPago
MP_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos

# Configuração do servidor
PORT=3001
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=4096
NODE_ENV=production
```

### 4. Configurar Domínio

1. No EasyPanel, configure o domínio desejado
2. O EasyPanel automaticamente configurará HTTPS via Let's Encrypt

### 5. Deploy

1. Clique em "Deploy" no EasyPanel
2. Aguarde o build da imagem Docker
3. Verifique os logs para confirmar que subiu corretamente

## 🔧 Troubleshooting

### Erro de Build
- Verifique se o `dist-server/` existe
- Execute `build-for-easypanel.bat` novamente
- Certifique-se de que o `Dockerfile` está na raiz

### Erro 500 na API
- Verifique as variáveis de ambiente
- Confirme que o Supabase está acessível
- Verifique os logs no EasyPanel

### Upload ainda com erro 413
- O proxy do EasyPanel pode ter limites próprios
- Ajuste `MAX_UPLOAD_SIZE_MB` se necessário
- Considere usar upload em chunks (já implementado)

### Erro no Build Docker
Se você ver erro como:
```
COPY failed: file not found in build context
```
Certifique-se de que:
- O `dist-server/` foi criado pelo build
- O `Dockerfile` está na raiz do projeto
- O `.dockerignore` não está excluindo arquivos necessários

## 📦 Arquivos Importantes

- `Dockerfile` - Dockerfile principal (copiado de `Dockerfile.correto`)
- `Dockerfile.correto` - Versão de backup/desenvolvimento
- `.dockerignore` - Exclui arquivos desnecessários do build
- `dist-server/` - Código compilado do servidor
- `package.json` - Dependências de produção

## 🔄 Atualizações

Para atualizações:
1. Compile novamente com `build-for-easypanel.bat`
2. Faça push das mudanças (método Git) ou upload
3. O EasyPanel fará redeploy automaticamente

## 📈 Monitoramento

- Use os logs do EasyPanel para monitorar a aplicação
- Configure alertas se necessário
- Monitore uso de recursos (CPU/Memória)

## 🌐 URLs de Exemplo

- Frontend: `https://startt.pontocomaudio.net`
- API Health: `https://startt.pontocomaudio.net/api/health`
- Upload: `https://startt.pontocomaudio.net/api/upload/:clientName`
- Upload Chunked: `https://startt.pontocomaudio.net/api/upload-chunked/:clientName`

## 📝 Comando de Build do EasyPanel

O EasyPanel executará algo similar a:
```bash
docker build \
  -f /etc/easypanel/projects/startt-pontocom/frontend-startt/code/Dockerfile \
  -t easypanel/startt-pontocom/frontend-startt \
  --label 'keep=true' \
  --build-arg 'VITE_SUPABASE_URL=...' \
  --build-arg 'VITE_SUPABASE_ANON_KEY=...' \
  # ... outras variáveis
  /etc/easypanel/projects/startt-pontocom/frontend-startt/code/
``` 