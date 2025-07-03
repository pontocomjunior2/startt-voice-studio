-- 1. Remover a constraint antiga que não permite o valor 0.
-- O nome da constraint é "pedidos_creditos_debitados_check".
ALTER TABLE public.pedidos
DROP CONSTRAINT pedidos_creditos_debitados_check;

-- 2. Adicionar a nova constraint corrigida, que permite 0.
-- Isso reflete a nova lógica de negócio onde pedidos de IA podem ter custo 0 em créditos de gravação.
ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_creditos_debitados_check CHECK (creditos_debitados >= 0); 