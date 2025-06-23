-- MIGRATION: add_data_resposta_cliente_to_pedidos
--
-- OBJETIVO:
-- Adicionar coluna à tabela `pedidos` para armazenar quando o cliente
-- respondeu a uma solicitação de informação do admin.
--
-- MOTIVAÇÃO:
-- Permitir rastreamento temporal das respostas dos clientes a mensagens
-- enviadas pelos administradores via campo admin_message.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS data_resposta_cliente TIMESTAMPTZ;

COMMENT ON COLUMN public.pedidos.data_resposta_cliente IS 'Registra o momento em que o cliente respondeu à solicitação de informação do admin.';

SELECT 'Coluna `data_resposta_cliente` adicionada com sucesso à tabela `pedidos`.' as "Resultado"; 