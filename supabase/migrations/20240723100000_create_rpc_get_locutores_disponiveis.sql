-- MIGRATION: Recriação da função get_locutores_disponiveis_para_cliente
-- OBJETIVO: Corrigir o desalinhamento entre a assinatura de retorno e a query SELECT.

-- Passo 1: Remover a função antiga para permitir a mudança na assinatura de retorno.
DROP FUNCTION IF EXISTS public.get_locutores_disponiveis_para_cliente(uuid);

-- Passo 2: Recriar a função com a assinatura e a lógica corretas.
CREATE OR REPLACE FUNCTION public.get_locutores_disponiveis_para_cliente(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    nome character varying,
    descricao text,
    avatar_url character varying,
    amostra_audio_url character varying,
    ativo boolean,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_proximo_lote_pacote_id UUID;
    v_pacote_tem_restricao BOOLEAN;
BEGIN
    -- Encontrar o ID do pacote do próximo lote de crédito a ser consumido
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

    -- Se não houver lote de crédito válido, retorna uma tabela vazia.
    IF v_proximo_lote_pacote_id IS NULL THEN
        RETURN QUERY SELECT l.id, l.nome, l.descricao, l.avatar_url, l.amostra_audio_url, l.ativo, l.created_at FROM locutores l WHERE 1 = 0;
        RETURN;
    END IF;

    -- Verificar se este pacote tem alguma restrição
    SELECT EXISTS (
        SELECT 1 
        FROM pacotes_locutores pl
        WHERE pl.pacote_id = v_proximo_lote_pacote_id
    ) INTO v_pacote_tem_restricao;

    -- Retornar locutores com base na restrição
    IF v_pacote_tem_restricao THEN
        -- Se há restrição, retorna apenas os locutores associados
        RETURN QUERY
        SELECT l.id, l.nome, l.descricao, l.avatar_url, l.amostra_audio_url, l.ativo, l.created_at
        FROM locutores l
        JOIN pacotes_locutores pl ON l.id = pl.locutor_id
        WHERE pl.pacote_id = v_proximo_lote_pacote_id AND l.ativo = true;
    ELSE
        -- Se não há restrição, retorna todos os locutores ativos
        RETURN QUERY
        SELECT l.id, l.nome, l.descricao, l.avatar_url, l.amostra_audio_url, l.ativo, l.created_at
        FROM locutores l
        WHERE l.ativo = true;
    END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locutores_disponiveis_para_cliente(uuid) TO authenticated;

SELECT 'Função `get_locutores_disponiveis_para_cliente` recriada com sucesso.' as "Resultado"; 