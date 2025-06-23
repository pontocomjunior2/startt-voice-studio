-- =============================================================================
-- TESTE COMPLETO DO SISTEMA DE CRÉDITOS - SQL-FIRST TESTING
-- PontoComAudio - Sistema de Créditos com FIFO e Expiração
-- =============================================================================
-- 
-- INSTRUÇÕES:
-- 1. Copie e execute este arquivo no SQL Editor do Supabase Dashboard
-- 2. Execute cada seção por vez e verifique os resultados
-- 3. Compare os resultados esperados com os obtidos
-- 
-- =============================================================================

-- PREPARAÇÃO: Verificar estado inicial
-- =============================================================================

SELECT '=== ESTADO INICIAL ===' as teste;

-- 1. Verificar saldo atual do usuário de teste
SELECT 'Saldo inicial:' as descricao, get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as saldo;

-- 2. Ver lotes ativos
SELECT 'Lotes ativos:' as descricao;
SELECT 
  id,
  quantidade_adicionada,
  quantidade_usada,
  (quantidade_adicionada - quantidade_usada) as saldo_lote,
  data_validade,
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END as status_validade,
  observacao_admin
FROM lotes_creditos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
  AND status = 'ativo'
ORDER BY 
  CASE WHEN data_validade IS NULL THEN '2099-12-31'::timestamp ELSE data_validade END ASC,
  data_adicao ASC;

-- =============================================================================
-- TESTE 1: CRIAÇÃO DE PEDIDO COM FIFO
-- =============================================================================

SELECT '=== TESTE 1: CRIAÇÃO DE PEDIDO COM FIFO ===' as teste;

-- Verificar se existe locutor ativo
SELECT 'Locutores disponíveis:' as descricao;
SELECT id, nome, ativo FROM locutores WHERE ativo = true LIMIT 3;

-- Criar pedido usando FIFO (deve consumir do lote que vence primeiro)
SELECT 'Resultado da criação do pedido:' as descricao;
SELECT criar_pedido_com_guia(
  'e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid,
  (SELECT id FROM locutores WHERE ativo = true LIMIT 1),
  'Teste FIFO - Consumo de Créditos',
  'off',
  'Este é um teste do sistema FIFO. O sistema deve consumir créditos do lote que vence primeiro.',
  'Tom neutro e profissional',
  'Teste automatizado do sistema de créditos'
) as resultado_criacao;

-- Verificar saldo após criação (deve ter diminuído 1 crédito)
SELECT 'Saldo após criação:' as descricao, get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as novo_saldo;

-- Ver como ficaram os lotes após o consumo
SELECT 'Lotes após consumo FIFO:' as descricao;
SELECT 
  id,
  quantidade_adicionada,
  quantidade_usada,
  (quantidade_adicionada - quantidade_usada) as saldo_lote,
  data_validade,
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END as status_validade,
  observacao_admin
FROM lotes_creditos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
  AND status = 'ativo'
ORDER BY 
  CASE WHEN data_validade IS NULL THEN '2099-12-31'::timestamp ELSE data_validade END ASC,
  data_adicao ASC;

-- Ver o pedido criado
SELECT 'Pedido criado:' as descricao;
SELECT 
  id,
  id_pedido_serial,
  titulo,
  creditos_debitados,
  status,
  created_at
FROM pedidos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
ORDER BY created_at DESC
LIMIT 1;

-- =============================================================================
-- TESTE 2: EXPIRAÇÃO DE CRÉDITOS
-- =============================================================================

SELECT '=== TESTE 2: EXPIRAÇÃO DE CRÉDITOS ===' as teste;

-- Verificar créditos próximos ao vencimento (dentro de 1 dia)
SELECT 'Créditos próximos ao vencimento (1 dia):' as descricao;
SELECT verificar_creditos_proximos_vencimento(1) as alertas_vencimento;

-- Verificar créditos próximos ao vencimento (dentro de 7 dias)
SELECT 'Créditos próximos ao vencimento (7 dias):' as descricao;
SELECT verificar_creditos_proximos_vencimento(7) as alertas_vencimento_semana;

-- Executar expiração automática
SELECT 'Resultado da expiração automática:' as descricao;
SELECT expirar_creditos_vencidos() as resultado_expiracao;

-- Verificar saldo após expiração
SELECT 'Saldo após expiração:' as descricao, get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as saldo_pos_expiracao;

-- =============================================================================
-- TESTE 3: ESTORNO DE PEDIDO
-- =============================================================================

SELECT '=== TESTE 3: ESTORNO DE PEDIDO ===' as teste;

-- Obter o último pedido criado
SELECT 'Último pedido para estorno:' as descricao;
SELECT 
  id,
  id_pedido_serial,
  titulo,
  creditos_debitados,
  status
FROM pedidos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
  AND status = 'pendente'
ORDER BY created_at DESC
LIMIT 1;

-- Estornar o último pedido pendente
SELECT 'Resultado do estorno:' as descricao;
SELECT excluir_pedido_e_estornar_creditos_real(
  (SELECT id FROM pedidos 
   WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7' 
     AND status = 'pendente' 
   ORDER BY created_at DESC 
   LIMIT 1)
) as resultado_estorno;

-- Verificar saldo após estorno (deve ter voltado)
SELECT 'Saldo após estorno:' as descricao, get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as saldo_pos_estorno;

-- Ver como ficaram os lotes após estorno
SELECT 'Lotes após estorno:' as descricao;
SELECT 
  id,
  quantidade_adicionada,
  quantidade_usada,
  (quantidade_adicionada - quantidade_usada) as saldo_lote,
  data_validade,
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END as status_validade,
  observacao_admin
FROM lotes_creditos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
  AND status = 'ativo'
ORDER BY 
  CASE WHEN data_validade IS NULL THEN '2099-12-31'::timestamp ELSE data_validade END ASC,
  data_adicao ASC;

-- =============================================================================
-- TESTE 4: ADIÇÃO DE CRÉDITOS VIA PACOTE
-- =============================================================================

SELECT '=== TESTE 4: ADIÇÃO DE CRÉDITOS VIA PACOTE ===' as teste;

-- Verificar pacotes disponíveis
SELECT 'Pacotes disponíveis:' as descricao;
SELECT 
  id,
  nome,
  creditos_oferecidos,
  validade_dias,
  ativo
FROM pacotes 
WHERE ativo = true
LIMIT 3;

-- Adicionar créditos via pacote (simular compra)
SELECT 'Resultado da adição por pacote:' as descricao;
SELECT adicionar_creditos_por_pacote(
  'e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid,
  (SELECT id FROM pacotes WHERE ativo = true LIMIT 1),
  'TESTE_COMPLETO_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'teste_automatizado'
) as resultado_adicao_pacote;

-- Verificar saldo após adição
SELECT 'Saldo após adição por pacote:' as descricao, get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as saldo_final;

-- =============================================================================
-- TESTE 5: VERIFICAÇÃO FINAL DO SISTEMA
-- =============================================================================

SELECT '=== TESTE 5: VERIFICAÇÃO FINAL ===' as teste;

-- Resumo por categoria de validade
SELECT 'Resumo por categoria:' as descricao;
SELECT 
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END as categoria,
  COUNT(*) as total_lotes,
  SUM(quantidade_adicionada) as total_adicionado,
  SUM(quantidade_usada) as total_usado,
  SUM(quantidade_adicionada - quantidade_usada) as saldo_categoria
FROM lotes_creditos
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
  AND status = 'ativo'
GROUP BY 
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END
ORDER BY categoria;

-- Total geral de créditos ativos no sistema
SELECT 'Total de créditos ativos no sistema:' as descricao;
SELECT get_total_creditos_ativos() as total_sistema;

-- Histórico completo de lotes do usuário
SELECT 'Histórico completo:' as descricao;
SELECT 
  id,
  quantidade_adicionada,
  quantidade_usada,
  (quantidade_adicionada - quantidade_usada) as saldo_lote,
  data_validade,
  CASE 
    WHEN data_validade IS NULL THEN 'SEM_VALIDADE'
    WHEN data_validade < NOW() THEN 'EXPIRADO'
    ELSE 'VÁLIDO'
  END as status_validade,
  data_adicao,
  observacao_admin
FROM lotes_creditos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
ORDER BY data_adicao DESC;

-- =============================================================================
-- RESULTADOS ESPERADOS
-- =============================================================================

SELECT '=== RESULTADOS ESPERADOS ===' as teste;

/*
RESULTADOS ESPERADOS:

1. CRIAÇÃO DE PEDIDO:
   - Deve criar pedido com sucesso
   - Deve debitar 1 crédito do lote que vence primeiro (FIFO)
   - Saldo deve diminuir em 1

2. EXPIRAÇÃO:
   - Deve expirar apenas créditos vencidos
   - Créditos próximos ao vencimento devem ser alertados
   - Saldo deve refletir apenas créditos válidos

3. ESTORNO:
   - Deve excluir pedido e restaurar crédito
   - Deve reverter consumo no lote original (não criar novo lote)
   - Saldo deve voltar ao valor anterior

4. ADIÇÃO POR PACOTE:
   - Deve criar novo lote com validade conforme pacote
   - Deve aumentar saldo total

5. VERIFICAÇÃO FINAL:
   - Resumo por categoria deve bater com os lotes individuais
   - Total do sistema deve incluir todos os usuários
   - Histórico deve mostrar todas as operações

IMPORTANTE: 
- Créditos expirados não contam no saldo
- FIFO: primeiro a vencer, primeiro a ser consumido
- Estorno reverte consumo, não cria lote novo
*/ 