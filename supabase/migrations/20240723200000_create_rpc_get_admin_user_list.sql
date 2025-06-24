-- MIGRATION: create_rpc_get_admin_user_list_with_details
--
-- OBJETIVO:
-- Criar uma função que retorna a lista de usuários para o painel admin,
-- já incluindo o saldo de créditos calculado e uma lista dos nomes dos pacotes ativos.
--
-- MOTIVAÇÃO:
-- Centralizar a lógica de busca de dados complexos no backend,
-- melhorando a performance e simplificando o código do frontend.

DROP FUNCTION IF EXISTS public.get_admin_user_list_with_details();

CREATE OR REPLACE FUNCTION public.get_admin_user_list_with_details()
RETURNS TABLE(
    id uuid,
    full_name text,
    username text,
    email text,
    role text,
    updated_at timestamptz,
    saldo_calculado_creditos bigint,
    pacotes_ativos text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Garante que apenas admins possam chamar esta função
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem executar esta ação.';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.username,
        p.email,
        p.role,
        p.updated_at,
        -- Subquery para calcular o saldo total de créditos válidos
        (
            SELECT COALESCE(SUM(lc.quantidade_adicionada - lc.quantidade_usada), 0)::bigint
            FROM public.lotes_creditos lc
            WHERE lc.user_id = p.id
              AND lc.status = 'ativo'
              AND (lc.quantidade_adicionada - lc.quantidade_usada) > 0
              AND (lc.data_validade IS NULL OR lc.data_validade > NOW())
        ) AS saldo_calculado_creditos,
        -- Subquery para agregar os nomes dos pacotes ativos e distintos
        (
            SELECT ARRAY_AGG(DISTINCT pkg.nome ORDER BY pkg.nome)
            FROM public.lotes_creditos lc
            JOIN public.pacotes pkg ON lc.pacote_id = pkg.id
            WHERE lc.user_id = p.id
              AND lc.status = 'ativo'
              AND (lc.quantidade_adicionada - lc.quantidade_usada) > 0
              AND (lc.data_validade IS NULL OR lc.data_validade > NOW())
        ) AS pacotes_ativos
    FROM
        public.profiles p;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_list_with_details() TO authenticated;

SELECT 'Função `get_admin_user_list_with_details` criada com sucesso.' as "Resultado"; 