import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { PEDIDO_STATUS } from '../../types/pedido.type';
import { REVISAO_STATUS_ADMIN } from '../../types/revisao.type';

interface UpdatePedidoAudioAndStatusVariables {
  pedidoId: string;
  audioUrl?: string;
  novoStatus: string;
  adminMessage?: string;
}

const updatePedidoAudioAndStatus = async ({ pedidoId, audioUrl, novoStatus, adminMessage }: UpdatePedidoAudioAndStatusVariables) => {
  const updatePayload: { 
    status: string; 
    audio_final_url?: string;
    admin_message?: string;
  } = { 
    status: novoStatus 
  };
  
  if (audioUrl) {
    updatePayload.audio_final_url = audioUrl;
  }

  if (novoStatus === PEDIDO_STATUS.AGUARDANDO_CLIENTE && adminMessage) {
    updatePayload.admin_message = adminMessage;
  }

  const { error: updatePedidoError } = await supabase
    .from('pedidos')
    .update(updatePayload)
    .eq('id', pedidoId);

  if (updatePedidoError) {
    console.error('Erro ao atualizar status/audio do pedido:', updatePedidoError);
    throw new Error(updatePedidoError.message || 'Não foi possível atualizar o status/áudio do pedido.');
  }

  return null;
};

export const useUpdatePedidoAudioAndStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<null, Error, UpdatePedidoAudioAndStatusVariables>({
    mutationFn: updatePedidoAudioAndStatus,
    onSuccess: () => {
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