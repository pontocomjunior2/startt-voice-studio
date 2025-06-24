-- MIGRATION: create_rpc_set_client_narrator_permission
--
-- OBJETIVO:
-- Criar uma função RPC para que o admin possa definir uma permissão de
-- override (permitido, bloqueado ou padrão) para um par específico de cliente/locutor.
--
-- LÓGICA:
-- - Recebe cliente_id, locutor_id e o tipo da permissão.
-- - Se a permissão for 'padrão', remove qualquer override existente.
-- - Se for 'permitido' ou 'bloqueado', cria ou atualiza (UPSERT) a regra
--   na tabela `clientes_locutores_permissoes`.

CREATE OR REPLACE FUNCTION public.set_cliente_locutor_permissao(
    p_cliente_id uuid,
    p_locutor_id uuid,
    p_tipo_permissao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Garante que apenas admins podem chamar esta função
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem definir permissões.';
    END IF;

    -- Se a permissão for 'padrão', remove qualquer regra de override
    IF p_tipo_permissao = 'padrão' THEN
        DELETE FROM public.clientes_locutores_permissoes
        WHERE cliente_id = p_cliente_id AND locutor_id = p_locutor_id;
    ELSE
        -- Se for 'permitido' ou 'bloqueado', insere ou atualiza a regra
        INSERT INTO public.clientes_locutores_permissoes (cliente_id, locutor_id, tipo_permissao, admin_id_que_modificou)
        VALUES (p_cliente_id, p_locutor_id, p_tipo_permissao::tipo_permissao_override, auth.uid())
        ON CONFLICT (cliente_id, locutor_id) DO UPDATE
        SET tipo_permissao = EXCLUDED.tipo_permissao,
            admin_id_que_modificou = EXCLUDED.admin_id_que_modificou,
            created_at = NOW(); -- Atualiza o timestamp da modificação
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_cliente_locutor_permissao(uuid, uuid, text) TO authenticated;

SELECT 'Função `set_cliente_locutor_permissao` criada com sucesso.' as "Resultado"; 