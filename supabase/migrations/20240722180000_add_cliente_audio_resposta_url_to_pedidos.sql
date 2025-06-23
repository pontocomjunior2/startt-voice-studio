-- MIGRATION: add_cliente_audio_resposta_url_to_pedidos
--
-- OBJETIVO:
-- Adicionar coluna à tabela `pedidos` para armazenar a URL do arquivo de áudio
-- que o cliente pode anexar quando responde a uma solicitação de informação do admin.
--
-- MOTIVAÇÃO:
-- Permitir que clientes anexem arquivos de áudio juntamente com suas respostas
-- textuais às mensagens dos administradores.
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS cliente_audio_resposta_url TEXT;

COMMENT ON COLUMN public.pedidos.cliente_audio_resposta_url IS 'URL do arquivo de áudio anexado pelo cliente quando responde à solicitação de informação do admin.';

SELECT 'Coluna `cliente_audio_resposta_url` adicionada com sucesso à tabela `pedidos`.' as "Resultado"; 