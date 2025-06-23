# PROMPT PARA RESOLVER PROBLEMA DE CRÉDITOS - PONTOCOMAUDIO

## 🎯 **OBJETIVO PRINCIPAL**
Resolver definitivamente o problema onde **créditos não aparecem no frontend** (nem para clientes nem para admin) na aplicação PontoComAudio.

## 📋 **CONTEXTO DO PROJETO**

### **Stack Tecnológica:**
- Frontend: React + TypeScript + Vite + Tailwind CSS + ShadCN UI
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Pagamentos: Mercado Pago (PIX + Cartão)
- Deploy: Docker + EasyPanel
- Estados: TanStack Query + React Context

### **Sistema de Créditos - COMO DEVE FUNCIONAR:**

**1. Fonte Única de Verdade:** Tabela `lotes_creditos` (NÃO usar `profiles.credits`)

**2. Estrutura da Tabela `lotes_creditos`:**
```sql
- id (UUID)
- user_id (UUID) -> FK para profiles.id
- quantidade_adicionada (INTEGER) -> créditos adicionados
- quantidade_usada (INTEGER) -> créditos já consumidos  
- data_validade (TIMESTAMP) -> NULL = sem validade
- status (TEXT) -> 'ativo' | 'inativo'
- data_adicao (TIMESTAMP)
- admin_id_que_adicionou (UUID)
- observacao_admin (TEXT)
```

**3. Lógica de Saldo:**
```sql
-- Saldo do usuário = soma de lotes válidos não expirados
SELECT SUM(quantidade_adicionada - quantidade_usada) as saldo_total
FROM lotes_creditos 
WHERE user_id = $1 
  AND status = 'ativo'
  AND (data_validade IS NULL OR data_validade > NOW())
```

**4. Como Créditos São Adicionados:**
- **Pagamentos MP:** RPC `adicionar_creditos_por_pacote` cria entrada em lotes_creditos
- **Admin Manual:** INSERT direto em lotes_creditos via AdminUsuariosPage
- **NUNCA:** Atualizar diretamente `profiles.credits`

**5. Como Créditos São Exibidos:**
- **Cliente:** AuthContext busca lotes válidos e soma no campo `saldoCalculadoCreditos`
- **Admin:** AdminUsuariosPage busca lotes válidos para cada usuário
- **Dashboard:** AdminDashboardPage soma todos os lotes válidos

## 📁 **ARQUIVOS CRÍTICOS PARA ANÁLISE**

### **1. PRIMEIRO: Leia estes documentos de contexto:**
- `ANALISE-VALIDADE-CREDITOS.md` - Análise completa do sistema
- `CORRECAO-CREDITOS-FINAL.md` - Último estado das correções  
- `DEBUG-CREDITOS-FRONTEND.md` - Debugging aplicado
- `CONFIGURACAO-TOKENS-MP.md` - Config Mercado Pago
- `WEBHOOK-MERCADOPAGO-CONFIG.md` - Config webhook

### **2. Arquivos de código principais:**
- `src/contexts/AuthContext.tsx` - Busca créditos do cliente logado
- `src/pages/admin/AdminUsuariosPage.tsx` - Lista créditos de todos usuários
- `src/pages/admin/admin-dashboard-page.tsx` - Card total de créditos
- `src/pages/TesteCreditosPage.tsx` - Página para debug
- `server/api/webhook-mp-pagamentos.ts` - Webhook que adiciona créditos
- `server/api/processar-pagamento-cartao-mp.ts` - Endpoint cartão

## 🔍 **PROBLEMAS IDENTIFICADOS E TENTATIVAS**

### **Tentativa 1: Arquitetura Híbrida**
- **Problema:** profiles.credits vs lotes_creditos inconsistente
- **Correção:** Migrou tudo para lotes_creditos apenas

### **Tentativa 2: Campos Incorretos**
- **Problema:** Código usava `quantidade` mas tabela tinha `quantidade_adicionada`
- **Correção:** Corrigidos todos os campos

### **Tentativa 3: Sintaxe Query Supabase**
- **Problema:** `.or('data_validade.is.null,data_validade.gt.' + date)` estava incorreto
- **Correção:** Mudou para template literals `.or(\`data_validade.is.null,data_validade.gt.${date}\`)`

### **Status Atual:**
❌ **PROBLEMA PERSISTE:** Créditos ainda não aparecem no frontend

## 🚨 **SUA MISSÃO**

### **Passo 1: DIAGNÓSTICO CRÍTICO**
Execute estas verificações NA ORDEM:

```sql
-- 1. Verificar se tabela existe
SELECT COUNT(*) FROM lotes_creditos;

-- 2. Ver estrutura da tabela
\d lotes_creditos

-- 3. Verificar dados existentes
SELECT * FROM lotes_creditos LIMIT 10;

-- 4. Verificar usuários com lotes
SELECT 
  p.username,
  p.credits as credits_antigos,
  COALESCE(SUM(l.quantidade_adicionada - l.quantidade_usada), 0) as creditos_validos
FROM profiles p
LEFT JOIN lotes_creditos l ON l.user_id = p.id 
  AND l.status = 'ativo'
  AND (l.data_validade IS NULL OR l.data_validade > NOW())
GROUP BY p.id, p.username, p.credits
LIMIT 10;
```

### **Passo 2: VERIFICAR LOGS DO FRONTEND**
1. Abra Developer Tools → Console
2. Faça login na aplicação
3. Procure por logs `[AuthContext] DEBUGGING:`
4. Navegue para `/teste-creditos` e execute os testes

### **Passo 3: IDENTIFICAR O PROBLEMA REAL**

**Se tabela não existe:**
- Criar tabela manualmente
- Executar migrations

**Se tabela existe mas sem dados:**
- Testar pagamento MP para gerar lotes
- Adicionar lotes manualmente via admin

**Se dados existem mas queries falham:**
- Verificar RLS (Row Level Security)
- Verificar permissões do usuário
- Verificar se sintaxe das queries está correta

**Se tudo funciona no backend mas não no frontend:**
- Verificar se AuthContext está sendo atualizado
- Verificar se componentes usam o campo correto (`saldoCalculadoCreditos`)
- Verificar cache do TanStack Query

### **Passo 4: CORREÇÕES ESPECÍFICAS**

**Para AuthContext (linha ~168):**
```typescript
// Deve mostrar logs detalhados e calcular saldoCalculadoCreditos
console.log(`[AuthContext] DEBUGGING: Usuário ${userId} - Total créditos válidos: ${creditosValidos}`);
updatedProfileData.saldoCalculadoCreditos = creditosValidos;
```

**Para AdminUsuariosPage (linha ~100):**
```typescript
// Deve mostrar créditos na coluna usando saldoCalculadoCreditos
<TableCell>{user.saldoCalculadoCreditos ?? 0}</TableCell>
```

**Para AdminDashboardPage (card créditos):**
```typescript
// Deve usar customValue do estado totalCreditosAtivos
customValue: totalCreditosAtivos,
customLoading: loadingCreditosAtivos,
```

## 💡 **ESTRATÉGIA DE RESOLUÇÃO**

### **1. NÃO refaça o que já foi feito**
- As correções de sintaxe já foram aplicadas
- Os logs de debug já foram adicionados
- A arquitetura já foi migrada para lotes_creditos

### **2. FOQUE no diagnóstico**
- Execute as queries SQL acima
- Analise os logs do console
- Identifique onde está o gap

### **3. TESTE incremental**
- Primeiro: verifique se dados existem no banco
- Segundo: se queries retornam dados corretos  
- Terceiro: se frontend recebe e exibe os dados

### **4. DOCUMENTE tudo**
- Crie logs detalhados de cada teste
- Anote exatamente onde o problema ocorre
- Mantenha registro das soluções aplicadas

## 🎯 **RESULTADO ESPERADO**

**Após a correção, o usuário deve ver:**

1. **Cliente logado:** Saldo de créditos no canto superior direito
2. **Admin → Usuários:** Coluna "Créditos" mostrando saldos corretos
3. **Admin → Dashboard:** Card "Créditos (Clientes)" com total geral
4. **Console:** Logs confirmando que queries funcionam e retornam dados

**Valores de exemplo esperados:**
- Cliente com 100 créditos comprados + 50 adicionados manualmente = 150 créditos
- Admin vê total de todos os clientes = soma de todos os saldos válidos

## ⚠️ **IMPORTANTE**

- **NÃO toque** em `profiles.credits` - não é mais usado
- **SEM RPC** `get_saldo_creditos_validos` - foi substituído por queries diretas  
- **MANTENHA** logs de debug até confirmar que funciona
- **TESTE** em produção após correções locais funcionarem

---

**Início:** ${new Date().toLocaleString('pt-BR')}
**Prioridade:** CRÍTICA - Sistema de pagamentos depende disso
**Meta:** Créditos funcionando 100% em até 2 horas 