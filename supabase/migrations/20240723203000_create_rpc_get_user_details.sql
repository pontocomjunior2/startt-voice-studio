-- MIGRATION: create_rpc_get_user_details_for_admin
--
-- OBJETIVO:
-- Criar uma função que retorna o saldo de créditos e a lista de pacotes ativos
-- para um ÚNICO usuário, a ser chamada pelo frontend para cada linha da tabela de admin.
--
-- MOTIVAÇÃO:
-- Simplificar a lógica de busca de dados, tornando-a mais granular e menos propensa a erros,
-- substituindo a função que buscava todos os usuários de uma vez.

CREATE OR REPLACE FUNCTION public.get_user_details_for_admin(p_user_id uuid)
RETURNS TABLE (
    saldo_calculado_creditos bigint,
    pacotes_ativos text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (
            SELECT COALESCE(SUM(lc.quantidade_adicionada - lc.quantidade_usada), 0)::bigint
            FROM public.lotes_creditos lc
            WHERE lc.user_id = p_user_id
              AND lc.status = 'ativo'
              AND (lc.quantidade_adicionada - lc.quantidade_usada) > 0
              AND (lc.data_validade IS NULL OR lc.data_validade > NOW())
        ) AS saldo_calculado_creditos,
        (
            SELECT ARRAY_AGG(DISTINCT pkg.nome ORDER BY pkg.nome)
            FROM public.lotes_creditos lc
            JOIN public.pacotes pkg ON lc.pacote_id = pkg.id
            WHERE lc.user_id = p_user_id
              AND lc.status = 'ativo'
              AND (lc.quantidade_adicionada - lc.quantidade_usada) > 0
              AND (lc.data_validade IS NULL OR lc.data_validade > NOW())
        ) AS pacotes_ativos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_details_for_admin(uuid) TO authenticated;

SELECT 'Função `get_user_details_for_admin` criada com sucesso.' as "Resultado"; 