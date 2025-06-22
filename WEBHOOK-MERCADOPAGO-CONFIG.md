# 🔧 Configuração do Webhook Mercado Pago

## Variáveis de Ambiente Necessárias

Para o webhook funcionar corretamente, adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Mercado Pago - API
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx  # ou PROD-xxxx para produção
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx           # Mesmo valor (legado)

# Mercado Pago - Webhook
MP_WEBHOOK_SECRET=seu_webhook_secret_aqui          # Obrigatório para verificação de assinatura
MP_NOTIFICATION_URL=https://seudominio.com/api/webhook-mp-pagamentos

# API
API_URL=https://seudominio.com                     # URL base da sua API
NODE_ENV=production                                # ou development
```

## 🔑 Como Obter o Webhook Secret

1. **Acesse o Dashboard do Mercado Pago**
   - Teste: https://www.mercadopago.com.br/developers/panel/app
   - Produção: Mesmo URL, mas mude para modo produção

2. **Configure o Webhook**
   - Vá em "Webhooks" ou "Notificações"
   - Crie um novo webhook com a URL: `https://seudominio.com/api/webhook-mp-pagamentos`
   - Eventos: `payment.created`, `payment.updated`

3. **Copie o Secret**
   - O Mercado Pago fornecerá um "Secret" único
   - Este é o valor para `MP_WEBHOOK_SECRET`

## 🛡️ Verificação de Assinatura

O webhook implementa verificação de assinatura HMAC-SHA256 conforme documentação do Mercado Pago:

- ✅ **Produção**: Verificação ativa (obrigatória)
- ⚠️ **Desenvolvimento**: Verificação desabilitada (para testes)

## 📋 Função RPC Necessária

O webhook usa a função RPC `adicionar_creditos_por_pacote` que deve estar criada no Supabase:

```sql
CREATE OR REPLACE FUNCTION adicionar_creditos_por_pacote(
  p_user_id UUID,
  p_pacote_id UUID,
  p_pagamento_id_externo TEXT,
  p_metodo_pagamento TEXT
)
RETURNS JSON AS $$
-- Implementação da função aqui
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔄 Fluxo de Pagamento

1. **Cliente faz pagamento** → Mercado Pago
2. **Mercado Pago** → Webhook (com metadados)
3. **Webhook verifica** → Assinatura + Status aprovado
4. **Webhook chama** → RPC `adicionar_creditos_por_pacote`
5. **Créditos adicionados** → Banco de dados atualizado

## 🐛 Debug e Logs

Para debugar problemas:

```bash
# Ver logs do webhook
tail -f logs/webhook-mp.log

# Testar webhook localmente (tunnel necessário)
ngrok http 3001
# Use a URL do ngrok no MP Dashboard
```

## ✅ Checklist de Configuração

- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado
- [ ] `MP_WEBHOOK_SECRET` configurado
- [ ] Webhook configurado no Dashboard MP
- [ ] URL pública acessível (HTTPS em produção)
- [ ] Função RPC `adicionar_creditos_por_pacote` criada
- [ ] Testes realizados com pagamentos de teste

## 🚨 Importante

- **Nunca exponha** o `MP_WEBHOOK_SECRET` no frontend
- **Use HTTPS** em produção (obrigatório)
- **Teste primeiro** no ambiente de sandbox do MP 