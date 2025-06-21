# Deploy via ZIP no EasyPanel

## 🎯 Deploy Rápido via Upload

Este método é ideal quando o repositório Git não está atualizado ou você prefere um deploy direto.

## 📦 Passo 1: Criar o ZIP

Execute o script automatizado:
```bash
create-easypanel-zip.bat
```

Este script irá:
1. ✅ Compilar o servidor TypeScript
2. ✅ Preparar o Dockerfile
3. ✅ Criar estrutura otimizada
4. ✅ Gerar `pontocomaudio-easypanel.zip`

## 🚀 Passo 2: Upload no EasyPanel

### Na interface do EasyPanel:

1. **Criar Nova Aplicação**
   - Clique em "New App"
   - Escolha um nome (ex: `pontocomaudio-backend`)

2. **Configurar Origem**
   - Aba "Origem" → Selecione **"Enviar"**
   - Faça upload do arquivo `pontocomaudio-easypanel.zip`

3. **Configurar Build**
   - Método: **Dockerfile** (já selecionado)
   - Arquivo: `Dockerfile` (detectado automaticamente)

## ⚙️ Passo 3: Variáveis de Ambiente

Adicione todas as variáveis necessárias:

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
PORT=3001
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=4096
NODE_ENV=production
```

## 🌐 Passo 4: Configurar Domínio

1. Configure o domínio desejado
2. EasyPanel configurará HTTPS automaticamente

## 🚀 Passo 5: Deploy!

1. Clique em **"Deploy"**
2. Aguarde o build da imagem Docker
3. Monitore os logs

## 📦 Conteúdo do ZIP

O arquivo `pontocomaudio-easypanel.zip` contém:

```
📁 pontocomaudio-easypanel.zip
├── Dockerfile              # Configurado para EasyPanel
├── .dockerignore           # Otimização do build
├── package.json            # Dependências de produção
└── dist-server/           # Código compilado
    ├── server.js          # Servidor principal
    └── api/               # APIs compiladas
        ├── gerar-pagamento-pix-mp.js
        ├── gerar-roteiro-ia.js
        └── webhook-mp-pagamentos.js
```

## ✅ Vantagens do Deploy via ZIP

- 🚀 **Rápido**: Não depende do Git
- 🎯 **Direto**: Upload imediato
- 🔒 **Controlado**: Você sabe exatamente o que está sendo deployado
- 📦 **Otimizado**: Apenas arquivos necessários
- 🛡️ **Seguro**: Sem exposição de código-fonte

## 🔄 Para Atualizações

1. Faça as mudanças no código
2. Execute `create-easypanel-zip.bat` novamente
3. Faça novo upload no EasyPanel
4. Redeploy automático

## 🆘 Troubleshooting

### ZIP muito grande
- Verifique se `node_modules/` não está incluído
- Confirme que apenas `dist-server/` está no ZIP

### Erro no build
- Verifique se `dist-server/` foi criado
- Confirme que todas as variáveis de ambiente estão configuradas

### API não responde
- Verifique os logs do EasyPanel
- Confirme que a porta 3001 está configurada
- Teste as variáveis de ambiente do Supabase 