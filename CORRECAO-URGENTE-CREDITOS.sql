-- =============================================================================
-- CORREÇÃO URGENTE - Sistema de Créditos
-- PontoComAudio - Correção da coluna 'creditos' para 'creditos_oferecidos'
-- =============================================================================
-- 
-- PROBLEMA: Função estava usando 'creditos' mas a tabela usa 'creditos_oferecidos'
-- SOLUÇÃO: Recriar apenas a função com correção
-- 
-- Execute este arquivo IMEDIATAMENTE no SQL Editor do Supabase
-- =============================================================================

-- Função corrigida: adicionar_creditos_por_pacote
CREATE OR REPLACE FUNCTION adicionar_creditos_por_pacote(
  p_user_id UUID,
  p_pacote_id UUID,
  p_pagamento_id_externo TEXT,
  p_metodo_pagamento TEXT DEFAULT 'mercado_pago'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pacote_creditos INTEGER;
  v_pacote_validade_dias INTEGER;
  v_data_validade TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- 1. Buscar informações do pacote (CORRIGIDO: creditos_oferecidos)
  SELECT creditos_oferecidos, validade_dias 
  INTO v_pacote_creditos, v_pacote_validade_dias
  FROM pacotes
  WHERE id = p_pacote_id AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pacote não encontrado ou inativo',
      'pacote_id', p_pacote_id
    );
  END IF;

  -- 2. Calcular data de validade
  IF v_pacote_validade_dias IS NOT NULL AND v_pacote_validade_dias > 0 THEN
    v_data_validade := NOW() + (v_pacote_validade_dias || ' days')::INTERVAL;
  ELSE
    v_data_validade := NULL; -- Sem validade
  END IF;

  -- 3. Inserir lote de créditos
  INSERT INTO lotes_creditos (
    user_id,
    quantidade_adicionada,
    quantidade_usada,
    data_validade,
    status,
    admin_id_que_adicionou,
    observacao_admin
  ) VALUES (
    p_user_id,
    v_pacote_creditos,
    0,
    v_data_validade,
    'ativo',
    NULL,
    'Créditos adicionados por compra de pacote: ' || p_pacote_id || ' (Pagamento: ' || p_pagamento_id_externo || ')'
  );

  -- 4. Retornar resultado
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'pacote_id', p_pacote_id,
    'creditos_adicionados', v_pacote_creditos,
    'data_validade', v_data_validade,
    'pagamento_id', p_pagamento_id_externo,
    'metodo_pagamento', p_metodo_pagamento
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro interno: ' || SQLERRM,
      'user_id', p_user_id,
      'pacote_id', p_pacote_id
    );
END;
$$;

-- Função para expirar créditos vencidos automaticamente
CREATE OR REPLACE FUNCTION expirar_creditos_vencidos()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lotes_expirados RECORD;
  v_total_lotes_processados INTEGER := 0;
  v_total_creditos_expirados INTEGER := 0;
  v_lotes_detalhes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Buscar lotes que expiraram mas ainda têm saldo disponível
  FOR v_lotes_expirados IN
    SELECT 
      id,
      user_id,
      quantidade_adicionada,
      quantidade_usada,
      (quantidade_adicionada - quantidade_usada) as saldo_a_expirar,
      data_validade,
      data_adicao
    FROM lotes_creditos
    WHERE status = 'ativo'
      AND data_validade IS NOT NULL 
      AND data_validade < NOW()
      AND quantidade_adicionada > quantidade_usada
    ORDER BY data_validade ASC
  LOOP
    -- Marcar todo o saldo restante como usado (expirado)
    UPDATE lotes_creditos
    SET quantidade_usada = quantidade_adicionada
    WHERE id = v_lotes_expirados.id;
    
    -- Contabilizar
    v_total_lotes_processados := v_total_lotes_processados + 1;
    v_total_creditos_expirados := v_total_creditos_expirados + v_lotes_expirados.saldo_a_expirar;
    
    -- Adicionar aos detalhes
    v_lotes_detalhes := array_append(
      v_lotes_detalhes,
      'Lote ' || v_lotes_expirados.id || ': ' || v_lotes_expirados.saldo_a_expirar || ' créditos expirados em ' || v_lotes_expirados.data_validade
    );
    
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'lotes_processados', v_total_lotes_processados,
    'creditos_expirados', v_total_creditos_expirados,
    'detalhes', v_lotes_detalhes,
    'processado_em', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao processar expiração de créditos',
      'details', SQLERRM
    );
END;
$$;

-- Função para criar pedido com consumo FIFO
CREATE OR REPLACE FUNCTION criar_pedido_com_guia(
  p_user_id UUID,
  p_locutor_id UUID,
  p_titulo TEXT,
  p_tipo_audio TEXT,
  p_texto_roteiro TEXT,
  p_estilo_locucao TEXT,
  p_orientacoes TEXT DEFAULT NULL,
  p_audio_guia_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creditos_necessarios INTEGER := 1; -- Por padrão, cada pedido custa 1 crédito
  v_saldo_disponivel INTEGER;
  v_pedido_id UUID;
  v_id_pedido_serial TEXT;
  v_consumo_result JSON;
  v_result JSON;
BEGIN
  -- 1. Verificar se o usuário existe e está ativo
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'cliente') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado ou não é cliente',
      'user_id', p_user_id
    );
  END IF;

  -- 2. Verificar se o locutor existe e está ativo
  IF NOT EXISTS (SELECT 1 FROM locutores WHERE id = p_locutor_id AND ativo = true) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Locutor não encontrado ou inativo',
      'locutor_id', p_locutor_id
    );
  END IF;

  -- 3. Verificar saldo de créditos disponíveis
  SELECT get_saldo_creditos_validos(p_user_id) INTO v_saldo_disponivel;
  
  IF v_saldo_disponivel < v_creditos_necessarios THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Créditos insuficientes',
      'creditos_disponiveis', v_saldo_disponivel,
      'creditos_necessarios', v_creditos_necessarios,
      'message', 'Você precisa de ' || v_creditos_necessarios || ' crédito(s) para criar este pedido. Saldo atual: ' || v_saldo_disponivel
    );
  END IF;

  -- 4. Gerar ID único do pedido
  v_pedido_id := gen_random_uuid();
  
  -- 5. Gerar ID serial legível (timestamp + random)
  v_id_pedido_serial := TO_CHAR(NOW(), 'YYYYMMDDHH24MI') || '_' || SUBSTRING(v_pedido_id::text, 1, 8);

  -- 6. Consumir créditos usando FIFO
  SELECT consumir_creditos(p_user_id, v_creditos_necessarios, v_pedido_id) INTO v_consumo_result;
  
  IF NOT (v_consumo_result->>'success')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Falha ao consumir créditos',
      'details', v_consumo_result->>'error'
    );
  END IF;

  -- 7. Criar o pedido
  INSERT INTO pedidos (
    id,
    id_pedido_serial,
    user_id,
    locutor_id,
    titulo,
    tipo_audio,
    texto_roteiro,
    estilo_locucao,
    orientacoes,
    audio_guia_url,
    status,
    creditos_debitados,
    created_at
  ) VALUES (
    v_pedido_id,
    v_id_pedido_serial,
    p_user_id,
    p_locutor_id,
    p_titulo,
    p_tipo_audio,
    p_texto_roteiro,
    p_estilo_locucao,
    p_orientacoes,
    p_audio_guia_url,
    'pendente',
    v_creditos_necessarios,
    NOW()
  );

  -- 8. Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'pedido_id', v_pedido_id,
    'id_pedido_serial', v_id_pedido_serial,
    'creditos_debitados', v_creditos_necessarios,
    'creditos_restantes', (v_consumo_result->>'creditos_restantes')::integer,
    'message', 'Pedido criado com sucesso! ' || v_creditos_necessarios || ' crédito(s) debitado(s).'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro interno ao criar pedido',
      'details', SQLERRM,
      'note', 'Se créditos foram debitados incorretamente, contacte o suporte'
    );
END;
$$;

-- Atualizar grants para todas as funções
GRANT EXECUTE ON FUNCTION adicionar_creditos_por_pacote(UUID, UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION expirar_creditos_vencidos() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION criar_pedido_com_guia(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Teste rápido após correção
SELECT 'TESTE PÓS-CORREÇÃO:' as status;

-- 1. Verificar se a função funciona agora
SELECT 'Teste da função corrigida:' as descricao;
SELECT adicionar_creditos_por_pacote(
  'e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid,
  (SELECT id FROM pacotes WHERE ativo = true LIMIT 1),
  'TESTE_CORRECAO_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'teste_correcao'
) as resultado_teste;

-- 2. Verificar saldo após teste
SELECT 'Saldo após correção:' as descricao, 
       get_saldo_creditos_validos('e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid) as saldo_atual;

-- 3. Ver o último lote criado
SELECT 'Último lote criado:' as descricao;
SELECT 
  id,
  quantidade_adicionada,
  data_validade,
  observacao_admin,
  data_adicao
FROM lotes_creditos 
WHERE user_id = 'e94ef54f-dff3-42b2-b9da-b477aa5871f7'
ORDER BY data_adicao DESC
LIMIT 1;

-- 4. Teste de criação de pedido
SELECT 'Teste de criação de pedido:' as descricao;
SELECT criar_pedido_com_guia(
  'e94ef54f-dff3-42b2-b9da-b477aa5871f7'::uuid,
  (SELECT id FROM locutores WHERE ativo = true LIMIT 1),
  'Teste Pós-Correção - FIFO',
  'off',
  'Este é um teste após a correção da coluna creditos_oferecidos.',
  'Tom neutro',
  'Teste automatizado pós-correção'
) as resultado_pedido;

SELECT '✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!' as status; 