# 📅 Análise - Sistema de Validade dos Créditos

## ✅ **Status Atual - Créditos Sincronizados:**
- ✅ **Cliente mostra:** 90 créditos (profiles.credits)
- ✅ **Admin mostra:** 90 créditos (profiles.credits) 
- ✅ **Pagamentos funcionam** e créditos aparecem corretamente
- ✅ **Validação aceita** pedidos com créditos suficientes

## ⚠️ **Problema Identificado - Validade dos Créditos:**

### **Situação Atual:**
- **Pagamentos via MP:** Salvam apenas em `profiles.credits` (sem validade) ❌
- **Admin manual:** Pode criar com validade em `lotes_creditos` ✅
- **RPC original:** Tentava somar `profiles.credits` + `lotes_creditos` válidos
- **Sistema híbrido inconsistente** entre diferentes fontes

### **Comportamento Esperado:**
1. **Créditos de pacotes** devem ter validade conforme configurado (ex: 30 dias)
2. **Créditos expirados** não devem contar no saldo
3. **Interface deve mostrar** créditos válidos (não expirados)
4. **Admin deve adicionar** com validade baseada no pacote comprado

## 🏗️ **Arquitetura Atual:**

### **Tabelas:**
```sql
-- profiles.credits: Créditos diretos (sem validade)
-- lotes_creditos: Créditos com validade e auditoria
```

### **Fontes de Créditos:**
1. **`profiles.credits`** → Pagamentos MP + Admin direto (sem validade)
2. **`lotes_creditos`** → Admin com validade + (deveria incluir pagamentos)

### **Problema:**
- **Pagamentos não criam entrada em `lotes_creditos`** com validade do pacote
- **Sistema fica híbrido** e inconsistente

## 🔧 **Soluções Possíveis:**

### **Opção A - Correção da RPC (Recomendada):**

#### **1. Corrigir Webhook MP:**
```typescript
// webhook-mp-pagamentos.ts - LINHA 136
// EM VEZ DE: Só chamar RPC (que pode estar inconsistente)
const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('adicionar_creditos_por_pacote', {
  p_user_id: userId,
  p_pacote_id: pacoteId,
  p_pagamento_id_externo: paymentId.toString(),
  p_metodo_pagamento: payment.payment_method_id || 'mercado_pago'
});

// GARANTIR QUE A RPC:
// 1. Busca validade_dias do pacote
// 2. Cria entrada em lotes_creditos com data_validade = NOW() + validade_dias
// 3. Atualiza profiles.credits (opcional, para compatibilidade)
```

#### **2. Corrigir Endpoint Manual:**
```typescript
// processar-pagamento-cartao-mp.ts - LINHA 90+
// EM VEZ DE: Só atualizar profiles.credits
const { error: updateError } = await supabaseAdmin
  .from('profiles')
  .update({ credits: newCredits })
  .eq('id', userIdCliente);

// FAZER: Criar entrada em lotes_creditos COM validade
const { data: pacoteInfo } = await supabaseAdmin
  .from('pacotes')
  .select('validade_dias')
  .eq('id', pacoteId)
  .single();

const dataValidade = pacoteInfo.validade_dias 
  ? new Date(Date.now() + pacoteInfo.validade_dias * 24 * 60 * 60 * 1000)
  : null;

const { error: loteError } = await supabaseAdmin
  .from('lotes_creditos')
  .insert({
    user_id: userIdCliente,
    quantidade: pacote.creditos_oferecidos,
    metodo_pagamento: 'credit_card_manual',
    valor_pago: valorTotal,
    pacote_id: pacoteId,
    data_validade: dataValidade,
    status: 'ativo'
  });
```

#### **3. Corrigir RPC `get_saldo_creditos_validos`:**
```sql
-- Garantir que soma profiles.credits + lotes_creditos válidos
CREATE OR REPLACE FUNCTION get_saldo_creditos_validos(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT 
      COALESCE(p.credits, 0) + 
      COALESCE(SUM(l.quantidade - l.quantidade_usada), 0)
    FROM profiles p
    LEFT JOIN lotes_creditos l ON l.user_id = p.id 
      AND l.status = 'ativo'
      AND (l.data_validade IS NULL OR l.data_validade > NOW())
    WHERE p.id = p_user_id
    GROUP BY p.credits
  );
END;
$$ LANGUAGE plpgsql;
```

#### **4. Restaurar RPC nas Interfaces:**
```typescript
// AuthContext.tsx e AdminUsuariosPage.tsx
// Descomentar código da RPC após corrigir
const { data: saldoData } = await supabase.rpc('get_saldo_creditos_validos', { p_user_id: userId });
updatedProfileData.saldoCalculadoCreditos = saldoData ?? 0;
```

### **Opção B - Simplificação Total:**

#### **1. Migrar Tudo para `lotes_creditos`:**
- Mover todos os créditos de `profiles.credits` para `lotes_creditos`
- Sempre criar com validade baseada no pacote
- `profiles.credits` vira campo calculado ou removido

#### **2. Usar Apenas `profiles.credits`:**
- Adicionar campo `validade` na tabela `profiles`
- Simplificar arquitetura (mais direto, menos flexível)

### **Opção C - Manter Status Quo (Temporário):**
- Manter correção atual funcionando
- Implementar validade futuramente quando necessário
- Sistema atual funciona sem expiração

## 📋 **Recomendação:**

### **Implementação Gradual:**

#### **Fase 1 - Imediata (Status Atual):**
- ✅ Manter correção atual funcionando
- ✅ Cliente e admin mostram mesmos valores
- ✅ Pagamentos funcionam perfeitamente
- ⏳ Sem expiração de créditos (aceitar temporariamente)

#### **Fase 2 - Curto Prazo:**
1. **Corrigir RPC `adicionar_creditos_por_pacote`** para criar em `lotes_creditos` com validade
2. **Corrigir endpoint manual** para usar `lotes_creditos` com validade  
3. **Testar** que pagamentos criam entradas com validade correta

#### **Fase 3 - Médio Prazo:**
1. **Restaurar RPC** `get_saldo_creditos_validos` nas interfaces
2. **Validar** que créditos expirados não contam
3. **Migrar créditos existentes** de `profiles.credits` para `lotes_creditos` se necessário

## 🎯 **Para Implementar Agora (Se Urgente):**

### **1. Verificar se RPC `adicionar_creditos_por_pacote` existe e funciona:**
```sql
-- No Supabase SQL Editor:
SELECT prosrc FROM pg_proc WHERE proname = 'adicionar_creditos_por_pacote';
```

### **2. Se RPC não existir ou estiver quebrada, criar:**
```sql
CREATE OR REPLACE FUNCTION adicionar_creditos_por_pacote(
  p_user_id uuid,
  p_pacote_id uuid,
  p_pagamento_id_externo text,
  p_metodo_pagamento text
) RETURNS json AS $$
DECLARE
  v_pacote record;
  v_data_validade timestamp with time zone;
BEGIN
  -- Buscar informações do pacote
  SELECT creditos_oferecidos, validade_dias 
  INTO v_pacote
  FROM pacotes 
  WHERE id = p_pacote_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'message', 'Pacote não encontrado');
  END IF;
  
  -- Calcular data de validade
  IF v_pacote.validade_dias IS NOT NULL THEN
    v_data_validade = NOW() + (v_pacote.validade_dias || ' days')::interval;
  ELSE
    v_data_validade = NULL;
  END IF;
  
  -- Criar entrada em lotes_creditos
  INSERT INTO lotes_creditos (
    user_id, 
    quantidade, 
    quantidade_usada,
    metodo_pagamento,
    pacote_id,
    pagamento_id_externo,
    data_validade,
    status
  ) VALUES (
    p_user_id,
    v_pacote.creditos_oferecidos,
    0,
    p_metodo_pagamento,
    p_pacote_id,
    p_pagamento_id_externo,
    v_data_validade,
    'ativo'
  );
  
  -- Também atualizar profiles.credits para compatibilidade atual
  UPDATE profiles 
  SET credits = COALESCE(credits, 0) + v_pacote.creditos_oferecidos
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'status', 'success', 
    'message', 'Créditos adicionados com sucesso',
    'creditos_adicionados', v_pacote.creditos_oferecidos,
    'validade', v_data_validade
  );
END;
$$ LANGUAGE plpgsql;
```

### **3. Testar novo pagamento:**
- Fazer pagamento de teste
- Verificar se cria entrada em `lotes_creditos` com validade
- Verificar se atualiza `profiles.credits` também

## 📊 **Status da Validade:**

### **❌ Atualmente:**
- Créditos de pagamentos **NÃO expiram** (só em profiles.credits)
- Créditos de admin manual **PODEM expirar** (se criados em lotes_creditos)

### **✅ Após Correção:**
- Todos os créditos de pacotes **expiram conforme configurado**
- Sistema de validade **funcionará uniformemente**
- Interface **mostrará apenas créditos válidos**

## 🚀 **Próxima Ação Recomendada:**

1. **Deploy da correção atual** (sincronização cliente/admin) ✅
2. **Verificar se sistema funciona** sem expiração por enquanto ✅
3. **Decidir urgência** da implementação de validade
4. **Se urgente:** Implementar Fase 2 (correção das RPCs)
5. **Se não urgente:** Manter status quo funcional

**O sistema está funcional e sincronizado. A validade é uma melhoria, não uma correção crítica.** 