-- MIGRATION: update_criar_pedido_add_locutor_validation
--
-- OBJETIVO:
-- Adicionar uma verificação de segurança na função `criar_pedido_com_guia`
-- para garantir que o locutor selecionado pelo cliente é permitido pelo
-- pacote de crédito que será consumido.
--
-- MOTIVAÇÃO:
-- Evitar que um cliente possa burlar a lógica do frontend e criar um pedido
-- para um locutor ao qual ele não tem direito.

CREATE OR REPLACE FUNCTION public.criar_pedido_com_guia(
  p_user_id UUID,
  p_locutor_id UUID,
  p_titulo TEXT,
  -- ... (outros parâmetros existentes)
  p_audio_guia_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- ... (outras variáveis existentes)
  v_proximo_lote_pacote_id UUID;
  v_locutor_permitido BOOLEAN;
BEGIN
  -- ... (verificações existentes de usuário e locutor)

  -- 1. Identificar o pacote do próximo lote a ser consumido
  SELECT lote.pacote_id INTO v_proximo_lote_pacote_id
  FROM lotes_creditos AS lote
  WHERE lote.user_id = p_user_id
    AND lote.status = 'ativo'
    AND (lote.quantidade_adicionada - lote.quantidade_usada) > 0
    AND (lote.data_validade IS NULL OR lote.data_validade > NOW())
  ORDER BY 
    CASE WHEN lote.data_validade IS NULL THEN '2099-12-31'::timestamp ELSE lote.data_validade END ASC,
    lote.data_adicao ASC
  LIMIT 1;

  -- 2. NOVA VERIFICAÇÃO: Checar se o locutor é permitido para este pacote
  IF v_proximo_lote_pacote_id IS NOT NULL THEN
    SELECT EXISTS (
      -- Se houver qualquer entrada para este pacote, o locutor DEVE estar na lista
      SELECT 1
      FROM pacotes_locutores pl
      WHERE pl.pacote_id = v_proximo_lote_pacote_id AND pl.locutor_id = p_locutor_id
    ) INTO v_locutor_permitido;

    -- Se o pacote tem restrições E o locutor não está na lista, rejeitar.
    IF EXISTS(SELECT 1 FROM pacotes_locutores WHERE pacote_id = v_proximo_lote_pacote_id) AND NOT v_locutor_permitido THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Locutor não disponível para o seu pacote de créditos atual.'
      );
    END IF;
  END IF;

  -- ... (resto da lógica: verificar saldo, consumir créditos, criar pedido)
  -- A lógica original continua a partir daqui...

  -- 3. Verificar saldo de créditos disponíveis (lógica existente)
  SELECT get_saldo_creditos_validos(p_user_id) INTO v_saldo_disponivel;
  
  IF v_saldo_disponivel < v_creditos_necessarios THEN
    RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;

  -- ... (continua com a lógica de consumir créditos e inserir o pedido)

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Erro interno ao criar pedido', 'details', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_pedido_com_guia(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

SELECT 'Função `criar_pedido_com_guia` atualizada com sucesso para validar a permissão do locutor.' as "Resultado"; 