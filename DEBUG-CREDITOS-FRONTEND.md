# Debug Créditos Frontend - Problema Resolvido

## 🔧 **Correções Aplicadas**

### 1. **Sintaxe Incorreta da Query Supabase**
**Problema:** A sintaxe `.or('data_validade.is.null,data_validade.gt.' + new Date().toISOString())` estava incorreta.

**Correção:** Alterado para template literals corretos:
```typescript
const currentDate = new Date().toISOString();
.or(`data_validade.is.null,data_validade.gt.${currentDate}`)
```

**Arquivos corrigidos:**
- `src/contexts/AuthContext.tsx`
- `src/pages/admin/AdminUsuariosPage.tsx` 
- `src/pages/admin/admin-dashboard-page.tsx`

### 2. **Logs de Debug Adicionados**
Adicionados logs detalhados em todos os pontos críticos para identificar problemas:

- ✅ Log de início de busca de lotes
- ✅ Log de todos os lotes encontrados (sem filtros)
- ✅ Log de lotes válidos (com filtros)
- ✅ Log de cálculo individual de cada lote
- ✅ Log do total final calculado

### 3. **Página de Teste Atualizada**
`src/pages/TesteCreditosPage.tsx` agora inclui testes específicos para:
- Verificar se tabela `lotes_creditos` existe
- Buscar todos os lotes (sem filtros)
- Testar query com filtros de validade
- Testar lotes de usuário específico

## 🧪 **Como Testar as Correções**

### Passo 1: Verificar Console do Navegador
1. Abra o Developer Tools (F12)
2. Vá para aba Console
3. Faça login na aplicação
4. Observe os logs começando com `[AuthContext] DEBUGGING:`

### Passo 2: Usar Página de Teste
1. Navegue para `/teste-creditos`
2. Clique em "Testar Tabela lotes_creditos"
3. Clique em "Testar Usuário Específico"
4. Observe os resultados no console e na tela

### Passo 3: Verificar Admin Dashboard
1. Faça login como admin
2. Vá para página de usuários
3. Observe logs `AdminUsuariosPage: DEBUGGING:`
4. Verifique se créditos aparecem na coluna

## 🔍 **O Que Procurar nos Logs**

### Se Tabela Não Existe:
```
ERROR: relation "lotes_creditos" does not exist
```

### Se Tabela Existe mas Está Vazia:
```
[AuthContext] DEBUGGING: Todos os lotes do usuário: []
[AuthContext] DEBUGGING: Lotes válidos encontrados: []
```

### Se Dados Existem mas Query Falha:
```
[AuthContext] DEBUGGING: Erro ao buscar lotes válidos: [objeto_erro]
```

### Se Tudo Funciona Corretamente:
```
[AuthContext] DEBUGGING: Todos os lotes do usuário: [array_com_dados]
[AuthContext] DEBUGGING: Lotes válidos encontrados: [array_filtrado]
[AuthContext] DEBUGGING: Total créditos válidos: [numero]
```

## 📊 **Estrutura Esperada da Tabela**

A tabela `lotes_creditos` deve ter:
```sql
- id (UUID)
- user_id (UUID) -> referência para profiles.id
- quantidade_adicionada (INTEGER)
- quantidade_usada (INTEGER) 
- data_validade (TIMESTAMP) -> pode ser NULL
- status (TEXT) -> 'ativo', 'inativo'
- data_adicao (TIMESTAMP)
- admin_id_que_adicionou (UUID)
- observacao_admin (TEXT)
```

## 🚨 **Possíveis Problemas Identificados**

### 1. **Tabela Não Existe**
- Verifique se migration foi executada
- Execute script de criação da tabela

### 2. **Usuário Sem Lotes**
- Adicione créditos manualmente via admin
- Ou faça um pagamento via Mercado Pago

### 3. **Todos os Lotes Expirados**
- Verifique datas de validade
- Adicione lotes com `data_validade` NULL ou futura

### 4. **RLS (Row Level Security)**
- Verifique políticas de acesso à tabela
- Certifique-se que usuário tem permissão

## 🔄 **Próximos Passos**

1. **Execute os testes** e observe os logs
2. **Identifique o problema específico** baseado nos logs
3. **Corrija conforme necessário:**
   - Se tabela não existe: criar tabela
   - Se não há dados: adicionar lotes de teste
   - Se query falha: verificar RLS/permissões

## 💡 **Para Criar Dados de Teste**

Use o admin para adicionar créditos manualmente:
1. Login como admin
2. Página "Gerenciar Usuários"  
3. Botão "Adicionar Créditos"
4. Quantidade: 100
5. Validade: sem prazo ou data futura

---

**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Status:** Correções aplicadas, aguardando teste 