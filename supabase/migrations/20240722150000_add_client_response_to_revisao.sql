-- MIGRATION: add_client_response_to_revisao
--
-- OBJETIVO:
-- Adicionar colunas à tabela `solicitacoes_revisao` para permitir que
-- o cliente responda a uma solicitação de informação feita pelo admin.
--
-- MOTIVAÇÃO:
-- Fechar o ciclo de comunicação, permitindo uma interação de "ida e volta"
-- quando um pedido está com o status 'Aguardando Cliente'.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

ALTER TABLE public.solicitacoes_revisao
ADD COLUMN IF NOT EXISTS cliente_resposta_info TEXT,
ADD COLUMN IF NOT EXISTS data_resposta_cliente TIMESTAMPTZ;

COMMENT ON COLUMN public.solicitacoes_revisao.cliente_resposta_info IS 'Armazena a resposta do cliente à solicitação de informação do admin.';
COMMENT ON COLUMN public.solicitacoes_revisao.data_resposta_cliente IS 'Registra o momento em que o cliente enviou sua resposta.';

SELECT 'Colunas `cliente_resposta_info` e `data_resposta_cliente` adicionadas com sucesso à tabela `solicitacoes_revisao`.' as "Resultado"; 