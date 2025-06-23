-- MIGRATION: add_rls_policy_to_pacotes_locutores
--
-- OBJETIVO:
-- Criar uma política de segurança (RLS) para a tabela `pacotes_locutores`
-- que permita a leitura (SELECT) dos dados por qualquer usuário autenticado.
--
-- MOTIVAÇÃO:
-- A RLS estava ativada na tabela, mas sem nenhuma política, o que bloqueava
-- a leitura dos dados e fazia com que a função de filtragem de locutores falhasse,
-- retornando todos os locutores em vez da lista restrita.

CREATE POLICY "Permitir leitura pública de associações de pacotes"
ON public.pacotes_locutores
FOR SELECT
TO authenticated
USING (true);

SELECT 'Política de SELECT para `pacotes_locutores` criada com sucesso.' as "Resultado"; 