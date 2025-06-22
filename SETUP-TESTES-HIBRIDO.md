# 🔄 Setup Híbrido: Testes Locais + Webhook Produção

## 🎯 **Estratégia Correta para Testes:**

### **LOCAL (Desenvolvimento):**
```env
# Tokens de TESTE no ambiente local
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx

# Webhook aponta para produção (facilita debug)
MP_NOTIFICATION_URL=https://startt.pontocomaudio.net/api/webhook-mp-pagamentos
```

### **PRODUÇÃO (Servidor) - TEMPORÁRIO PARA TESTES:**
```env
# ⚠️ TEMPORÁRIO: Tokens de TESTE no servidor também
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MP_WEBHOOK_SECRET=SECRET_DE_TESTE_DO_MP
NODE_ENV=development  # Facilita debug
```

## 🔄 **Fluxo Correto:**

1. **Cliente faz pagamento TESTE** (local)
2. **MP ambiente TESTE** → webhook para produção
3. **Servidor produção** (com token TESTE) → busca pagamento
4. **Sucesso**: Pagamento encontrado no ambiente teste
5. **RPC executada** → Créditos adicionados

## 📋 **Configuração no Dashboard MP:**

### **Aplicação de TESTE:**
- **Webhook URL:** `https://startt.pontocomaudio.net/api/webhook-mp-pagamentos`
- **Eventos:** `payment.created`, `payment.updated`
- **Secret:** Use este valor no `MP_WEBHOOK_SECRET`

## ⚠️ **IMPORTANTE:**

### **Durante Testes (Próximos Dias):**
```env
# SERVIDOR DE PRODUÇÃO (temporário)
MP_ACCESS_TOKEN=TEST-xxxx...        # ← Token de TESTE
MP_WEBHOOK_SECRET=secret_de_teste   # ← Secret de TESTE
NODE_ENV=development                # ← Debug mode
```

### **Após Validar (Produção Final):**
```env
# SERVIDOR DE PRODUÇÃO (definitivo)
MP_ACCESS_TOKEN=APP_USR-827231625701605...  # ← Seu token real
MP_WEBHOOK_SECRET=secret_de_producao        # ← Secret de produção
NODE_ENV=production                         # ← Modo seguro
```

## 🎮 **Para Seus Testes:**

### **1. Configure Dashboard MP (Teste):**
- Crie webhook de TESTE apontando para: `https://startt.pontocomaudio.net/api/webhook-mp-pagamentos`
- Copie o SECRET fornecido

### **2. Configure Servidor (Temporário):**
```env
MP_ACCESS_TOKEN=TEST-xxxx...  # Token de teste
MP_WEBHOOK_SECRET=secret_do_passo_1
NODE_ENV=development
```

### **3. Teste Pagamentos:**
- 💳 **Cartão teste:** `4509 9535 6623 3704`
- 🏦 **PIX teste:** Funcionará normalmente
- 💰 **Zero cobrança:** Tudo simulado

### **4. Monitore Logs:**
```bash
# Ver se webhooks chegam
tail -f /logs/aplicacao

# Verificar RPC
# Logs do Supabase
```

## 🚨 **Checklist Final:**

- [ ] **Token TESTE** no servidor (temporário)
- [ ] **Secret TESTE** no servidor
- [ ] **NODE_ENV=development** no servidor
- [ ] **Webhook configurado** no MP (teste)
- [ ] **Testado** com cartão/PIX falso
- [ ] **Logs verificados** no servidor

## 🔄 **Transição para Produção:**

Depois dos testes validados:

1. **Configure webhook** real no MP (produção)
2. **Troque tokens** no servidor para produção
3. **NODE_ENV=production** no servidor
4. **Teste** com valor baixo real

## 💡 **Por que Esta Estratégia:**

- ✅ **Debug fácil**: Logs diretos no servidor
- ✅ **Sem ngrok**: Não precisa túnel
- ✅ **Zero risco**: Pagamentos falsos
- ✅ **Transição suave**: Só trocar tokens depois 