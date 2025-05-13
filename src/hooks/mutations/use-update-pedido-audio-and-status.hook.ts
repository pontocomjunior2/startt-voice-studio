import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface UpdatePedidoAudioAndStatusVariables {
  pedidoId: string;
  audioUrl: string;
  novoStatus: string;
}

const updatePedidoAudioAndStatus = async ({ pedidoId, audioUrl, novoStatus }: UpdatePedidoAudioAndStatusVariables) => {
  const { error } = await supabase
    .from('pedidos')
    .update({ audio_final_url: audioUrl, status: novoStatus })
    .eq('id', pedidoId);

  if (error) {
    console.error('Erro ao atualizar pedido:', error);
    throw new Error(error.message || 'Não foi possível atualizar o pedido.');
  }
  return null;
};

export const useUpdatePedidoAudioAndStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<null, Error, UpdatePedidoAudioAndStatusVariables>({
    mutationFn: updatePedidoAudioAndStatus,
    onSuccess: (_data, variables) => {
      toast.success('Pedido atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['adminActiveOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinalizedOrders'] });
    },
    onError: (error) => {
      toast.error('Falha ao atualizar pedido', {
        description: error.message,
      });
    },
  });
}; 