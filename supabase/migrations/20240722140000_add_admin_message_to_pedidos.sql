-- MIGRATION: add_admin_message_to_pedidos
--
-- OBJETIVO:
-- Adicionar uma coluna para armazenar mensagens do admin para o cliente,
-- especificamente quando um pedido é colocado no status "Aguardando Cliente".
--
-- MOTIVAÇÃO:
-- Permitir que o admin solicite informações ou esclarecimentos ao cliente
-- de forma clara e registrada no próprio pedido.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS admin_message TEXT;

COMMENT ON COLUMN public.pedidos.admin_message IS 'Mensagem enviada pelo admin quando o status do pedido é alterado para "Aguardando Cliente", para solicitar mais informações.';

SELECT 'Coluna `admin_message` adicionada com sucesso à tabela `pedidos`.' as "Resultado"; 