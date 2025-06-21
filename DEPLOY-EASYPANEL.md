# Deploy no EasyPanel - PontoComAudio

## 📋 Pré-requisitos

- Conta no EasyPanel
- Arquivo `pontocomaudio-easypanel.zip` gerado pelo script `create-easypanel-zip.bat`

## 🚀 Processo de Deploy

### 1. Preparar Arquivos de Deploy

Execute o script automatizado:
```bash
.\create-easypanel-zip.bat
```

Este script irá:
- Compilar o servidor TypeScript
- Criar o ZIP com todos os arquivos necessários
- Gerar `pontocomaudio-easypanel.zip` (≈122KB)

### 2. Criar Aplicação no EasyPanel

1. **Acesse o EasyPanel** e crie um novo projeto
2. **Adicione um novo serviço** do tipo "App Service"
3. **Selecione "Upload" como fonte**
4. **Faça upload** do arquivo `pontocomaudio-easypanel.zip`

### 3. ⚠️ **IMPORTANTE: Configurar Volumes Persistentes**

Para manter os arquivos de upload entre deploys, configure volumes persistentes:

#### **Na seção "Mounts" do EasyPanel:**

**Volume para Uploads de Áudio:**
```
Tipo: Volume
Nome: uploads-storage
Mount Path: /app/public/uploads
```

**Volume para Arquivos Temporários:**
```
Tipo: Volume  
Nome: temp-storage
Mount Path: /app/temp
```

#### **Por que isso é necessário?**
- ✅ **Sem volumes**: Arquivos são perdidos a cada deploy
- ✅ **Com volumes**: Arquivos persistem permanentemente
- ✅ **Armazenamento local**: Como você desejou, sem custos externos

### 4. Configurar Variáveis de Ambiente

Na seção "Environment", adicione todas as variáveis:

#### **Supabase**
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

#### **APIs Externas**
```env
GEMINI_API_KEY=sua_gemini_key
GEMINI_MODEL=gemini-pro
MP_ACCESS_TOKEN=seu_mercadopago_token
MP_NOTIFICATION_URL=https://seu-dominio.com/api/webhook-mp-pagamentos
```

#### **Configurações da Aplicação**
```env
VITE_API_URL=https://seu-dominio.com
VITE_ADMIN_SECRET=seu_admin_secret
VITE_DOWNLOAD_PROXY_URL=https://sua-edge-function.supabase.co/functions/v1/download-proxy
```

#### **Configurações do Servidor**
```env
PORT=3001
MAX_UPLOAD_SIZE_MB=200
NODE_OPTIONS=--max-old-space-size=4096
NODE_ENV=production
```

### 5. Configurar Domínio e Proxy

1. **Adicione seu domínio** na seção "Domains & Proxy"
2. **Configure a porta**: `3001`
3. **Habilite HTTPS**: O EasyPanel configurará automaticamente

### 6. Deploy

1. **Clique em "Deploy"**
2. **Aguarde o build** (pode levar alguns minutos)
3. **Verifique os logs** para confirmar que tudo está funcionando

## 🔄 **Próximos Deploys**

Para atualizações futuras:

1. **Execute**: `.\create-easypanel-zip.bat`
2. **No EasyPanel**: Vá em "Source" → "Upload new file"
3. **Faça upload** do novo ZIP
4. **Deploy automaticamente**

**⚠️ IMPORTANTE**: Os volumes persistentes **mantêm todos os arquivos** entre deploys!

## 📁 **Estrutura de Armazenamento**

Com os volumes configurados:

```
/app/public/uploads/          ← Volume persistente
├── audios/                   ← Áudios dos clientes
│   └── [cliente]/
│       ├── [arquivo].mp3
│       └── revisoes/
├── avatars/                  ← Avatars dos locutores  
├── demos/                    ← Demos dos locutores
├── guias/                    ← Áudios guia
└── revisoes_guias/          ← Revisões de áudios guia

/app/temp/                    ← Volume persistente para temporários
└── uploads/                  ← Chunks de upload
```

## 🛠️ **Troubleshooting**

### Problema: Arquivos não são salvos
**Solução**: Verifique se os volumes estão configurados corretamente

### Problema: Erro de permissão
**Solução**: Os volumes do EasyPanel gerenciam permissões automaticamente

### Problema: Upload falha
**Solução**: Verifique a variável `MAX_UPLOAD_SIZE_MB`

## ✅ **Vantagens desta Configuração**

- 🏠 **Armazenamento local**: Como você desejou
- 💾 **Persistente**: Arquivos nunca são perdidos
- 💰 **Sem custos extras**: Incluído no EasyPanel
- 🚀 **Performance**: Acesso direto aos arquivos
- 🔧 **Simples**: Configuração uma única vez

## 📊 **Monitoramento**

- **Logs**: Disponíveis na interface do EasyPanel
- **Console**: Acesso terminal direto ao container
- **Métricas**: Uso de CPU, memória e storage

---

**🎯 Resultado**: Sistema totalmente funcional com armazenamento persistente local, exatamente como você queria! 