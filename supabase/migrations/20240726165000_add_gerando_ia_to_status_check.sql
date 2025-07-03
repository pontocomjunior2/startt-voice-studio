-- 1. Remover a constraint de status antiga, se ela ainda existir.
-- Usamos 'IF EXISTS' para evitar um erro caso ela já tenha sido removida em uma tentativa anterior.
ALTER TABLE public.pedidos
DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- 2. Adicionar a nova constraint de status, incluindo 'gerando_ia', 'estornado' e todos os outros status utilizados.
-- Esta é a lista definitiva e correta.
ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_status_check CHECK (
  status = ANY (ARRAY[
    'pendente'::text, 
    'gravando'::text, 
    'concluido'::text, 
    'cancelado'::text, 
    'em_revisao'::text, 
    'aguardando_cliente'::text, 
    'rejeitado'::text, 
    'gerando_ia'::text, 
    'em_producao'::text, 
    'em_analise'::text,
    'falhou'::text,
    'estornado'::text -- O status que faltava
  ])
); 