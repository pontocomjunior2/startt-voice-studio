import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface UpdatePedidoStatusVariables {
  pedidoId: string;
  novoStatus: string;
}

const updatePedidoStatus = async ({ pedidoId, novoStatus }: UpdatePedidoStatusVariables) => {
  const { error } = await supabase.rpc('update_pedido_status', {
    p_pedido_id: pedidoId,
    p_novo_status: novoStatus,
  });

  if (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw new Error(error.message || 'Não foi possível atualizar o status do pedido.');
  }
  return null; // RPC não retorna dados, apenas sucesso/erro
};

export const useUpdatePedidoStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<null, Error, UpdatePedidoStatusVariables>({
    mutationFn: updatePedidoStatus,
    onSuccess: (_data, variables) => {
      toast.success('Status do pedido atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['adminActiveOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); 
      
      // Se o status mudou para concluido ou cancelado, invalidar a lista de finalizados
      if (variables.novoStatus === 'concluido' || variables.novoStatus === 'cancelado') {
        queryClient.invalidateQueries({ queryKey: ['adminFinalizedOrders'] });
      }
      // Se você tiver uma query para detalhes de um pedido específico, invalide-a também:
      // queryClient.invalidateQueries({ queryKey: ['pedidoDetails', variables.pedidoId] });
    },
    onError: (error) => {
      toast.error('Falha ao atualizar status', {
        description: error.message,
      });
    },
  });
}; 