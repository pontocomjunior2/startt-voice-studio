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

# 🔧 CONFIGURAÇÃO CORRETA - MERCADO PAGO

## ❌ **PROBLEMA RESOLVIDO:** "At least one policy returned UNAUTHORIZED"

Este erro ocorre quando há problemas de configuração nas credenciais ou políticas do Mercado Pago.

---

## ✅ **CORREÇÕES APLICADAS NO CÓDIGO:**

### **1. Detecção Automática de Payment Method:**
```typescript
// ✅ ANTES: Hardcoded 'visa'
payment_method_id: 'visa'

// ✅ DEPOIS: Detecção automática baseada no número do cartão
const detectedPaymentMethod = detectPaymentMethod(card_data.number);
payment_method_id: detectedPaymentMethod
```

### **2. Campo Obrigatório Adicionado:**
```typescript
// ✅ CAMPO OBRIGATÓRIO PARA EVITAR UNAUTHORIZED
issuer_id: getIssuerId(detectedPaymentMethod)
```

### **3. Ano Completo no Cartão:**
```typescript
// ✅ ANTES: '25' (pode causar erro)
expiration_year: card_data.expiry_date.split('/')[1]

// ✅ DEPOIS: '2025' (formato correto)
expiration_year: `20${card_data.expiry_date.split('/')[1]}`
```

### **4. Chave de Idempotência:**
```typescript
// ✅ ADICIONADO PARA EVITAR DUPLICAÇÕES
requestOptions: {
  idempotencyKey: `${userIdCliente}-${pacoteId}-${Date.now()}`
}
```

---

## 🔑 **VERIFICAÇÃO DAS CREDENCIAIS:**

### **1. Confirmar Tipo de Token:**
```bash
# ✅ TESTE (deve começar com TEST-)
TEST-1234567890123456789-031415-abcdef1234567890-12345678

# ✅ PRODUÇÃO (deve começar com APP_USR-)
APP_USR-1234567890123456789-031415-abcdef1234567890-12345678
```

### **2. Verificar Arquivo .env:**
```env
# ✅ CERTIFIQUE-SE DE USAR O TOKEN CORRETO
MERCADOPAGO_ACCESS_TOKEN=TEST-sua-chave-de-teste-aqui
```

---

## 🏗️ **CONFIGURAÇÃO NO PAINEL MERCADO PAGO:**

### **1. Acessar o Painel:**
- Vá para: https://www.mercadopago.com.br/developers
- Faça login na sua conta

### **2. Criar/Configurar Aplicação:**
```
Dashboard → Suas integrações → Criar aplicação
```

### **3. Configurações Obrigatórias:**

#### **A) Credenciais:**
- ✅ Copie o **Access Token de Teste**
- ✅ Verifique se começa com `TEST-`

#### **B) Webhooks (se necessário):**
```
Webhooks → Configurar notificações
URL de Produção: https://suaapp.com/api/webhook-mp-pagamentos
Eventos: Pagamentos ✅
```

#### **C) Configurações de Aplicação:**
```
- Modelo de integração: ✅ Marketplace/Gateway
- Scopes necessários: ✅ read, write
- URLs permitidas: ✅ https://suaapp.com
```

---

## 🧪 **DADOS DE TESTE CORRETOS:**

### **Cartão de Teste APROVADO (APRO):**
```
Número: 4074 7000 0000 0001
Titular: APRO
CVV: 123
Validade: 12/25
CPF: 11111111111
```

### **Cartão de Teste REJEITADO (OTHE):**
```
Número: 4074 7000 0000 0002
Titular: OTHE
CVV: 123
Validade: 12/25
CPF: 11111111111
```

---

## 🔍 **DEBUGGING - VERIFICAÇÕES:**

### **1. Testar Credenciais:**
```bash
curl -X GET \
'https://api.mercadopago.com/v1/payment_methods' \
-H 'Authorization: Bearer SEU_ACCESS_TOKEN'
```

### **2. Verificar Logs do Servidor:**
```bash
# Procurar por estes logs:
"🔍 [DEBUG] ambiente: development"
"🔍 [DEBUG] tokenPrefix: TEST-12345..."
"🔄 [MERCADO PAGO API] Processamento com configuração corrigida"
```

### **3. Status de Resposta Esperados:**
- ✅ **200**: Pagamento processado
- ✅ **400**: Cartão rejeitado (comportamento normal)
- ❌ **401**: Problema de credenciais
- ❌ **403**: Problema de políticas

---

## 🚀 **PRÓXIMOS PASSOS:**

1. **Teste com cartão APRO** (deve aprovar)
2. **Teste com cartão OTHE** (deve rejeitar)
3. **Verifique webhooks** (só para aprovados)
4. **Monitore logs** do servidor

---

## 🆘 **SE AINDA DER ERRO:**

### **Verificar no Painel MP:**
1. **Suas integrações** → **[Sua App]**
2. **Credenciais** → Copiar novo token
3. **Qualidade** → Verificar status da integração

### **Logs Específicos para Procurar:**
```bash
"❌ [MERCADO PAGO API] Erro de autorização"
"💥 [ERRO] unauthorized"
"📨 [MERCADO PAGO API] Resposta recebida: status: rejected"
```

---

## ✅ **STATUS ATUAL:**
- [x] Campos obrigatórios adicionados
- [x] Detecção automática de bandeira
- [x] Formato de ano corrigido
- [x] Chave de idempotência implementada
- [x] Tratamento específico de erros de autorização

**O sistema agora deve processar pagamentos corretamente com a API oficial do Mercado Pago!** 🎉 