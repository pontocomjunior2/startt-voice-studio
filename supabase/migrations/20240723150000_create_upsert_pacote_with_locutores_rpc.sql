-- MIGRATION: create_or_replace_upsert_pacote_rpc
--
-- OBJETIVO:
-- Criar/Substituir a função RPC `upsert_pacote_with_locutores` para garantir
-- que a associação entre pacotes e locutores seja salva corretamente.
--
-- LÓGICA:
-- 1. A função aceita dados do pacote e uma lista de IDs de locutores.
-- 2. Ela executa um "upsert" na tabela `pacotes`.
-- 3. Em uma transação, ela primeiro deleta as associações antigas do pacote
--    na tabela `pacotes_locutores`.
-- 4. Em seguida, insere as novas associações baseadas na lista de IDs.
-- 5. Retorna o ID do pacote que foi criado ou atualizado.

DROP FUNCTION IF EXISTS public.upsert_pacote_with_locutores(jsonb, uuid[]);

CREATE OR REPLACE FUNCTION public.upsert_pacote_with_locutores(
  p_pacote_data jsonb,
  p_locutor_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_pacote_id uuid;
BEGIN
  -- 1. Executar o UPSERT na tabela de pacotes
  -- Se 'id' está no JSON, atualiza. Senão, insere.
  v_pacote_id := p_pacote_data->>'id';

  INSERT INTO public.pacotes (
    id, nome, descricao, valor, creditos_oferecidos, ativo, listavel, validade_dias
  ) VALUES (
    COALESCE(v_pacote_id, gen_random_uuid()),
    p_pacote_data->>'nome',
    p_pacote_data->>'descricao',
    (p_pacote_data->>'valor')::numeric,
    (p_pacote_data->>'creditos_oferecidos')::integer,
    (p_pacote_data->>'ativo')::boolean,
    (p_pacote_data->>'listavel')::boolean,
    (p_pacote_data->>'validade_dias')::integer
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    valor = EXCLUDED.valor,
    creditos_oferecidos = EXCLUDED.creditos_oferecidos,
    ativo = EXCLUDED.ativo,
    listavel = EXCLUDED.listavel,
    validade_dias = EXCLUDED.validade_dias,
    updated_at = NOW()
  RETURNING id INTO v_pacote_id;

  -- 2. Deletar associações antigas para este pacote
  DELETE FROM public.pacotes_locutores WHERE pacote_id = v_pacote_id;

  -- 3. Inserir novas associações se houver locutores selecionados
  IF array_length(p_locutor_ids, 1) > 0 THEN
    INSERT INTO public.pacotes_locutores (pacote_id, locutor_id)
    SELECT v_pacote_id, unnest(p_locutor_ids);
  END IF;

  -- 4. Retornar o ID do pacote
  RETURN v_pacote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_pacote_with_locutores(jsonb, uuid[]) TO authenticated;

SELECT 'Função `upsert_pacote_with_locutores` criada/atualizada com sucesso.' as "Resultado"; 