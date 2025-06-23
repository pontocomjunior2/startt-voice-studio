-- MIGRATION: add_pacote_id_to_lotes_creditos
--
-- OBJETIVO:
-- Adicionar a coluna `pacote_id` à tabela `lotes_creditos` para rastrear a
-- origem de cada lote de crédito.
--
-- MOTIVAÇÃO:
-- Esta coluna é essencial para que a função `get_locutores_disponiveis_para_cliente`
-- possa determinar quais locutores estão associados a um lote de crédito específico.

-- Adiciona a coluna, permitindo valores nulos para não quebrar lotes existentes.
ALTER TABLE public.lotes_creditos
ADD COLUMN IF NOT EXISTS pacote_id UUID;

-- Adiciona a chave estrangeira para garantir a integridade dos dados.
-- O `IF NOT EXISTS` não funciona para constraints, então a executamos separadamente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lotes_creditos_pacote_id_fkey'
  ) THEN
    ALTER TABLE public.lotes_creditos
    ADD CONSTRAINT lotes_creditos_pacote_id_fkey
    FOREIGN KEY (pacote_id) REFERENCES public.pacotes(id)
    ON DELETE SET NULL; -- Se um pacote for deletado, o lote não é, mas perde a referência.
  END IF;
END;
$$;

COMMENT ON COLUMN public.lotes_creditos.pacote_id IS 'Referência ao pacote que originou este lote de créditos.';

SELECT 'Coluna `pacote_id` e sua chave estrangeira adicionadas com sucesso à tabela `lotes_creditos`.' as "Resultado"; 