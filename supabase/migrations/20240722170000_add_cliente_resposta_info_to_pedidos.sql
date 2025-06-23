-- MIGRATION: add_cliente_resposta_info_to_pedidos
--
-- OBJETIVO:
-- Adicionar coluna à tabela `pedidos` para armazenar a resposta do cliente
-- quando o admin solicita informações via admin_message.
--
-- MOTIVAÇÃO:
-- Permitir que clientes respondam diretamente às solicitações de informação
-- feitas pelos administradores, armazenando essas respostas no próprio pedido.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS cliente_resposta_info TEXT;

COMMENT ON COLUMN public.pedidos.cliente_resposta_info IS 'Armazena a resposta do cliente à solicitação de informação enviada pelo admin via admin_message.';

SELECT 'Coluna `cliente_resposta_info` adicionada com sucesso à tabela `pedidos`.' as "Resultado"; 