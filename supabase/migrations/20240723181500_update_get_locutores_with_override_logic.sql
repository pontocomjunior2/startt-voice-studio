-- MIGRATION: update_get_locutores_with_override_logic
--
-- OBJETIVO:
-- Reescrever a função `get_locutores_disponiveis_para_cliente` para incluir
-- a lógica de override de permissões por cliente.
--
-- LÓGICA DE PRIORIDADE:
-- 1. Locutores EXPLICITAMENTE BLOQUEADOS para o cliente são sempre removidos.
-- 2. Locutores EXPLICITAMENTE PERMITIDOS para o cliente são sempre adicionados.
-- 3. Para os locutores restantes, a visibilidade é determinada pelas regras dos pacotes
--    de crédito que o cliente possui.

DROP FUNCTION IF EXISTS public.get_locutores_disponiveis_para_cliente(uuid);

CREATE OR REPLACE FUNCTION public.get_locutores_disponiveis_para_cliente(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    nome character varying,
    descricao text,
    avatar_url character varying,
    amostra_audio_url character varying,
    ativo boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pacotes_com_credito UUID[];
    v_algum_pacote_sem_restricao BOOLEAN;
BEGIN
    -- 1. Obter os pacotes válidos do cliente
    SELECT ARRAY_AGG(DISTINCT lote.pacote_id)
    INTO v_pacotes_com_credito
    FROM public.lotes_creditos AS lote
    WHERE lote.user_id = p_user_id
      AND lote.status = 'ativo'
      AND (lote.quantidade_adicionada - lote.quantidade_usada) > 0
      AND (lote.data_validade IS NULL OR lote.data_validade > NOW());

    -- 2. Verificar se algum pacote é "sem restrições"
    SELECT EXISTS (
        SELECT 1
        FROM public.lotes_creditos AS lote
        WHERE lote.user_id = p_user_id
          AND lote.status = 'ativo'
          AND (lote.quantidade_adicionada - lote.quantidade_usada) > 0
          AND (lote.data_validade IS NULL OR lote.data_validade > NOW())
          AND (lote.pacote_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.pacotes_locutores pl WHERE pl.pacote_id = lote.pacote_id
          ))
    ) INTO v_algum_pacote_sem_restricao;

    -- 3. Lógica de união e override
    RETURN QUERY
    WITH 
    locutores_base AS (
        -- Começa com uma lista base de locutores dependendo dos pacotes
        SELECT l.id FROM public.locutores l
        WHERE l.ativo = true AND (
            -- Ou o usuário tem um pacote sem restrições
            v_algum_pacote_sem_restricao = true OR
            -- Ou o locutor está na lista de permissões dos pacotes do usuário
            EXISTS (
                SELECT 1 FROM public.pacotes_locutores pl
                WHERE pl.locutor_id = l.id AND pl.pacote_id = ANY(v_pacotes_com_credito)
            )
        )
    ),
    locutores_permitidos_override AS (
        -- Locutores que o admin permitiu explicitamente
        SELECT clp.locutor_id as id FROM public.clientes_locutores_permissoes clp
        WHERE clp.cliente_id = p_user_id AND clp.tipo_permissao = 'permitido'
    ),
    locutores_bloqueados_override AS (
        -- Locutores que o admin bloqueou explicitamente
        SELECT clp.locutor_id as id FROM public.clientes_locutores_permissoes clp
        WHERE clp.cliente_id = p_user_id AND clp.tipo_permissao = 'bloqueado'
    )
    -- Lógica final de união e exclusão
    SELECT l.id, l.nome, l.descricao, l.avatar_url, l.amostra_audio_url, l.ativo
    FROM public.locutores l
    WHERE l.ativo = true AND l.id IN (
        -- Pega a união dos locutores base (dos pacotes) e os permitidos por override
        SELECT id FROM locutores_base
        UNION
        SELECT id FROM locutores_permitidos_override
    )
    -- E então remove os que foram explicitamente bloqueados
    AND l.id NOT IN (SELECT id FROM locutores_bloqueados_override);

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locutores_disponiveis_para_cliente(uuid) TO authenticated; 