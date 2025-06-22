# 🔧 Variáveis de Ambiente Complementares

Baseado nas suas variáveis existentes, adicione estas ao seu `.env` de produção:

```env
# ✅ Variáveis que você já possui (manter como estão)
VITE_SUPABASE_URL=https://wyhqnplylkonevbdvtnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwODc4OTUsImV4cCI6MjA2MjY2Mzg5NX0.NKJgyjqWmtZcEmP05G2wFGElsTlZXdhjL2b-nPiqUEU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHFucGx5bGtvbmV2YmR2dG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4Nzg5NSwiZXhwIjoyMDYyNjYzODk1fQ.8fjCst6v96NoaSPfpllxunqKd4IBMN3NdaroieDWFoE
VITE_DOWNLOAD_PROXY_URL=https://wyhqnplylkonevbdvtnk.supabase.co/functions/v1/download-proxy
VITE_API_URL=/api
VITE_ADMIN_SECRET=Conquista@@2
GEMINI_API_KEY=AIzaSyDFKkP35AfR2xU8dd9uYgYG-vHQJEjNTgI
GEMINI_MODEL=gemini-2.5-flash-lite-preview-06-17
MP_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
CORS_ALLOWED_ORIGINS=https://startt.pontocomaudio.net

# 🆕 VARIÁVEIS QUE FALTAM ADICIONAR:

# Mercado Pago - Webhook Secret (será fornecido após configurar o webhook)
MP_WEBHOOK_SECRET=PREENCHER_APÓS_CONFIGURAR_WEBHOOK_NO_MP

# Mercado Pago - Token alternativo (compatibilidade)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700

# Environment & API
NODE_ENV=production
API_URL=https://startt.pontocomaudio.net
```

## 🎯 **Variáveis Críticas Faltantes:**

1. **`MP_WEBHOOK_SECRET`** - 🔑 **CRÍTICO** (será fornecido pelo MP)
2. **`MERCADOPAGO_ACCESS_TOKEN`** - ✅ **Compatibilidade** (mesmo valor do MP_ACCESS_TOKEN)
3. **`NODE_ENV=production`** - ✅ **Para ativar verificação de assinatura**
4. **`API_URL`** - ✅ **URL base completa**

## 📋 **Como Obter o MP_WEBHOOK_SECRET:**

1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app
2. **Vá em:** "Webhooks" ou "Configurações" → "Notificações"
3. **Adicione webhook:**
   - URL: `https://startt.pontocomaudio.net/api/webhook-mp-pagamentos`
   - Eventos: `payment.created`, `payment.updated`
4. **Copie o Secret** fornecido pelo MP
5. **Cole em:** `MP_WEBHOOK_SECRET=valor_copiado` 