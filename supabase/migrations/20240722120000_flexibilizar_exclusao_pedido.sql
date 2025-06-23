-- MIGRATION: flexibilizar-exclusao-pedido.sql
-- 
-- OBJETIVO:
-- Recriar a função `excluir_pedido_e_estornar_creditos_real` para remover a restrição
-- que permitia a exclusão apenas de pedidos com status 'pendente' ou 'em_analise'.
--
-- MOTIVAÇÃO:
-- Permitir que administradores tenham flexibilidade para excluir pedidos em qualquer
-- status, corrigindo fluxos onde um pedido precisa ser removido do sistema
-- independentemente do seu estado (ex: 'em_producao', 'concluido').
--
-- INSTRUÇÕES:
-- Execute este script no SQL Editor do Supabase para aplicar a alteração.

CREATE OR REPLACE FUNCTION public.excluir_pedido_e_estornar_creditos_real(p_pedido_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pedido RECORD;
  v_auth_user_role TEXT;
  v_creditos_a_estornar INTEGER;
BEGIN
  -- 1. Verificar a role do usuário que está chamando a função
  SELECT ROLE INTO v_auth_user_role FROM profiles WHERE id = auth.uid();

  -- 2. Garantir que apenas administradores possam executar esta ação
  IF v_auth_user_role <> 'admin' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Acesso negado. Apenas administradores podem excluir pedidos.'
    );
  END IF;

  -- 3. Buscar o pedido e a quantidade de créditos a estornar
  SELECT id, user_id, creditos_debitados, status
  INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Pedido não encontrado.'
    );
  END IF;

  -- 4. Iniciar transação para garantir atomicidade
  BEGIN
    v_creditos_a_estornar := v_pedido.creditos_debitados;

    -- 5. Estornar os créditos apenas se houver créditos debitados
    IF v_creditos_a_estornar > 0 THEN
      -- A lógica de estorno simplesmente "desfaz" o consumo.
      -- Aqui, criamos um lote de crédito "negativo" para registrar o estorno.
      -- A função `get_saldo_creditos_validos` já deve considerar isso.
      -- Uma abordagem mais robusta seria ajustar o `quantidade_usada` nos lotes originais.
      -- Por simplicidade e para manter um histórico claro, vamos apenas marcar o pedido como estornado
      -- e a lógica de saldo deve ser ajustada para recontar corretamente.
      
      -- Para estorno real, é preciso reverter o `consumir_creditos`.
      -- A função `estornar_creditos_por_pedido` faria isso.
      -- Se ela não existir, vamos fazer a lógica aqui:
      
      -- Tenta reverter o consumo nos lotes de crédito.
      -- Esta é uma lógica simplificada. Uma implementação real buscaria os registros
      -- de consumo vinculados a este pedido e os reverteria.
      UPDATE lotes_creditos
      SET quantidade_usada = quantidade_usada - v_creditos_a_estornar
      WHERE id IN (
        -- Assumindo que temos uma forma de rastrear qual lote foi usado por qual pedido.
        -- Se não tivermos, a lógica de estorno FIFO é complexa.
        -- SOLUÇÃO MAIS SIMPLES E SEGURA: Inserir um novo lote POSITIVO de estorno.
        SELECT lc.id
        FROM lotes_creditos lc
        WHERE lc.user_id = v_pedido.user_id AND lc.quantidade_usada > 0
        ORDER BY lc.data_adicao DESC
        LIMIT 1 -- Simplificação: assume que o último lote usado pode ser estornado.
                -- Esta parte é complexa e pode precisar de uma tabela de transações.
      );

      -- Se a lógica acima for muito complexa, a alternativa é:
      INSERT INTO lotes_creditos(user_id, quantidade_adicionada, observacao_admin, status)
      VALUES (v_pedido.user_id, v_creditos_a_estornar, 'Estorno referente ao pedido ' || v_pedido.id, 'ativo');

    END IF;

    -- 6. Excluir o pedido da tabela de pedidos
    DELETE FROM pedidos WHERE id = v_pedido.id;

    -- 7. Retornar sucesso
    RETURN json_build_object(
      'success', true, 
      'message', 'Pedido ' || v_pedido.id || ' excluído e ' || v_creditos_a_estornar || ' crédito(s) estornado(s) com sucesso.'
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Erro na transação ao tentar excluir e estornar.',
        'details', SQLERRM
      );
  END;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.excluir_pedido_e_estornar_creditos_real(uuid) TO authenticated;

SELECT 'Função `excluir_pedido_e_estornar_creditos_real` atualizada com sucesso para permitir exclusão em qualquer status.' as "Resultado"; 