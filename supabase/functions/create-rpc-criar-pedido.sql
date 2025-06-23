-- Função RPC para criar pedido com consumo de créditos FIFO
-- Esta função é chamada pelo frontend quando um cliente cria um novo pedido

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
    -- Em caso de erro, tentar estornar créditos se o pedido não foi criado
    -- (O consumo já foi feito, mas o INSERT pode ter falhado)
    RETURN json_build_object(
      'success', false,
      'error', 'Erro interno ao criar pedido',
      'details', SQLERRM,
      'note', 'Se créditos foram debitados incorretamente, contacte o suporte'
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

-- Função para verificar créditos que vão expirar em X dias
CREATE OR REPLACE FUNCTION verificar_creditos_proximos_vencimento(p_dias_limite INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado JSON;
  v_lotes_proximos RECORD;
  v_alertas TEXT[] := ARRAY[]::TEXT[];
  v_total_creditos_vencendo INTEGER := 0;
BEGIN
  -- Buscar lotes que vão vencer nos próximos X dias
  FOR v_lotes_proximos IN
    SELECT 
      l.user_id,
      p.email,
      l.quantidade_adicionada - l.quantidade_usada as saldo_restante,
      l.data_validade,
      EXTRACT(DAYS FROM (l.data_validade - NOW())) as dias_para_vencer
    FROM lotes_creditos l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.status = 'ativo'
      AND l.data_validade IS NOT NULL 
      AND l.data_validade > NOW()
      AND l.data_validade <= NOW() + (p_dias_limite || ' days')::INTERVAL
      AND l.quantidade_adicionada > l.quantidade_usada
    ORDER BY l.data_validade ASC
  LOOP
    v_total_creditos_vencendo := v_total_creditos_vencendo + v_lotes_proximos.saldo_restante;
    
    v_alertas := array_append(
      v_alertas,
      'User: ' || v_lotes_proximos.email || ' - ' || v_lotes_proximos.saldo_restante || ' créditos vencem em ' || ROUND(v_lotes_proximos.dias_para_vencer) || ' dias (' || v_lotes_proximos.data_validade || ')'
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'dias_limite', p_dias_limite,
    'total_creditos_vencendo', v_total_creditos_vencendo,
    'total_alertas', array_length(v_alertas, 1),
    'alertas', v_alertas,
    'verificado_em', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao verificar créditos próximos ao vencimento',
      'details', SQLERRM
    );
END;
$$;

-- Grants para as funções
GRANT EXECUTE ON FUNCTION criar_pedido_com_guia(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION expirar_creditos_vencidos() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION verificar_creditos_proximos_vencimento(INTEGER) TO authenticated, service_role, anon; 