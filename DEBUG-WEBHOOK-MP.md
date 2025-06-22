# 🔍 Debug Webhook Mercado Pago - Guia Passo a Passo

## 🎯 **Problema Atual:**
- ✅ Pagamento processado com sucesso
- ❌ Créditos não foram adicionados
- 🔍 Webhook pode não estar funcionando

## 📋 **Checklist de Debug:**

### **1. Verificar se Webhook está sendo chamado:**

**Onde verificar logs do servidor:**
- EasyPanel → Logs da aplicação
- Terminal do servidor
- Logs do Docker container

**O que buscar nos logs:**
```bash
[Webhook MP] Recebido: {objeto do webhook}
[Webhook MP] Headers: {headers da requisição}
```

### **2. Se NÃO há logs de webhook:**

**Problema:** MP não está enviando webhook para servidor

**Soluções:**
1. **Verificar configuração no Dashboard MP:**
   - URL: `https://startt.pontocomaudio.net/api/webhook-mp-pagamentos`
   - Eventos: `payment.created`, `payment.updated`
   - Aplicação: **TESTE** (não produção durante testes)

2. **Testar endpoint manualmente:**
```bash
curl -X POST https://startt.pontocomaudio.net/api/webhook-mp-pagamentos \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.created","data":{"id":"123"}}'
```

### **3. Se HÁ logs de webhook recebido:**

**Verificar na sequência:**

#### **A. Verificação de Assinatura:**
Buscar nos logs:
```bash
[Webhook MP] Modo desenvolvimento - verificação de assinatura desabilitada
# OU
[Webhook MP] Assinatura verificada com sucesso
# OU
[Webhook MP] Assinatura inválida - webhook rejeitado
```

**Se assinatura inválida:**
- Verificar se `MP_WEBHOOK_SECRET` está correto
- Verificar se é o secret da aplicação de TESTE (não produção)

#### **B. Verificação de Dados:**
Buscar nos logs:
```bash
[Webhook MP] Detalhes do pagamento: {...}
[Webhook MP] Processando pagamento aprovado: {...}
```

**Se metadados não encontrados:**
```bash
[Webhook MP] Metadados essenciais não encontrados
```

**Causa:** Pagamento não foi criado com metadados corretos
**Solução:** Verificar se `userIdCliente` e `pacoteId` estão sendo enviados

#### **C. Verificação da RPC:**
Buscar nos logs:
```bash
[Webhook MP] RPC executada com sucesso
# OU
[Webhook MP] Erro ao chamar RPC do Supabase
```

### **4. Debug Específico - Metadados:**

**Verificar se pagamento foi criado com metadados:**

No código do frontend, confirmar se está enviando:
```javascript
metadata: {
  user_id_cliente: userIdCliente,
  pacote_id: pacoteId
}
```

### **5. Teste Manual da RPC:**

**No Supabase Dashboard → SQL Editor:**
```sql
SELECT adicionar_creditos_por_pacote(
  'SEU_USER_ID',
  'SEU_PACOTE_ID', 
  'PAYMENT_ID_TESTE',
  'teste_manual'
);
```

## 🚨 **Debugging Imediato:**

### **Passo 1: Verificar Logs**
1. Acesse EasyPanel → Sua aplicação → Logs
2. Faça novo pagamento teste
3. Verifique se aparecem logs do webhook

### **Passo 2: Se não há logs de webhook**
**Problema:** MP não está enviando webhook

**Ação:**
1. Verificar configuração no Dashboard MP
2. Testar endpoint com curl
3. Verificar se URL está acessível

### **Passo 3: Se há logs mas erro**
**Analisar o erro específico nos logs**

## 🔧 **Soluções Rápidas:**

### **Temporariamente desabilitar verificação de assinatura:**
```typescript
// No servidor, linha ~67
if (false) { // process.env.NODE_ENV === 'production'
  // Verificação desabilitada temporariamente para debug
}
```

### **Adicionar mais logs:**
```typescript
console.log('[DEBUG] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  MP_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'PRESENTE' : 'AUSENTE',
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET ? 'PRESENTE' : 'AUSENTE'
});
```

## 📞 **Próximos Passos:**

1. **Primeiro:** Verificar logs durante pagamento teste
2. **Segundo:** Reportar aqui o que encontrou nos logs
3. **Terceiro:** Seguir solução específica baseada nos logs

## 🎯 **Comandos Úteis:**

```bash
# Ver logs em tempo real (se tiver acesso ao servidor)
tail -f /var/log/aplicacao.log

# Testar endpoint
curl -X POST https://startt.pontocomaudio.net/api/webhook-mp-pagamentos \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
``` 