# 🔑 Configuração de Tokens - Mercado Pago

## 🎯 **Estratégia de Tokens por Ambiente:**

### 🚀 **PRODUÇÃO (Servidor Live)**
```env
# Token de PRODUÇÃO - Cobra dinheiro real
MP_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700
MERCADOPAGO_ACCESS_TOKEN=APP_USR-827231625701605-052423-f9eca2a8f7ebccb76fe1190a4aa64f1e-11725700
NODE_ENV=production

# Webhook de PRODUÇÃO
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
MP_WEBHOOK_SECRET=SEU_SECRET_DE_PRODUCAO_AQUI
```

### 🧪 **TESTES/Desenvolvimento**
```env
# Token de TESTE - NÃO cobra dinheiro real
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
NODE_ENV=development

# Webhook pode apontar para produção (para facilitar testes)
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
MP_WEBHOOK_SECRET=SEU_SECRET_DE_TESTE_AQUI
```

## 🎮 **Fase de Testes Inicial (RECOMENDADO):**

Para seus **primeiros testes**, use esta configuração temporária no servidor:

```env
# TEMPORÁRIO: Token de TESTE no servidor de produção
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
NODE_ENV=development  # Desabilita verificação de assinatura

# Webhook de produção (facilita debug)
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
MP_WEBHOOK_SECRET=SEU_SECRET_DE_TESTE
```

### ✅ **Vantagens desta abordagem:**
- 🎮 **Pagamentos falsos**: Não cobra dinheiro real
- 🐛 **Debug fácil**: Logs diretos no servidor
- 🚀 **Sem ngrok**: Não precisa túnel local
- ⚡ **Testes rápidos**: Setup imediato

## 📋 **Onde Obter os Tokens:**

### 🔗 **Dashboard Mercado Pago:**
1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app
2. **Selecione sua aplicação**
3. **Credenciais:**
   - 🧪 **Teste:** Token começa com `TEST-`
   - 🚀 **Produção:** Token começa com `APP_USR-`

## 🎯 **Sequência Recomendada:**

### **Fase 1: Testes (1-2 dias)**
```env
MP_ACCESS_TOKEN=TEST-xxxx...  # Token de TESTE
NODE_ENV=development          # Facilita debug
```
- ✅ Testar fluxo completo
- ✅ Verificar webhooks
- ✅ Debug de problemas

### **Fase 2: Produção (após testes)**
```env
MP_ACCESS_TOKEN=APP_USR-827231625701605...  # Seu token atual
NODE_ENV=production                         # Verificação de assinatura ativa
```
- ✅ Pagamentos reais
- ✅ Clientes finais
- ✅ Dinheiro real transferido

## 🚨 **IMPORTANTE:**

### **Com Token de TESTE:**
- 💳 Use cartões de teste: `4509 9535 6623 3704`
- 🏦 PIX simulado funciona
- 💰 **ZERO dinheiro real** é cobrado

### **Com Token de PRODUÇÃO:**
- 💳 Cartões reais serão cobrados
- 🏦 PIX real será cobrado
- 💰 **Dinheiro REAL** será transferido

## 🎯 **Para Seus Primeiros Testes:**

**Troque temporariamente** para token de TESTE no servidor:

1. **Obtenha token de teste** no Dashboard MP
2. **Substitua** no `.env` do servidor
3. **Teste** pagamentos falsos
4. **Após validar**, volte para token de produção

Esta estratégia garante segurança total durante os testes! 🛡️ 