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
  const updatePayload: { status: string; audio_final_url?: string } = { status: novoStatus };
  if (audioUrl) {
    updatePayload.audio_final_url = audioUrl;
  }

  const { error: updatePedidoError } = await supabase
    .from('pedidos')
    .update(updatePayload)
    .eq('id', pedidoId);

  if (updatePedidoError) {
    console.error('Erro ao atualizar status/audio do pedido:', updatePedidoError);
    throw new Error(updatePedidoError.message || 'Não foi possível atualizar o status/áudio do pedido.');
  }

  if (novoStatus === PEDIDO_STATUS.AGUARDANDO_CLIENTE && adminMessage) {
    const { data: pedidoUser } = await supabase
      .from('pedidos')
      .select('user_id')
      .eq('id', pedidoId)
      .single();

    if (pedidoUser?.user_id) {
      const solicitacaoData = {
        pedido_id: pedidoId,
        user_id: pedidoUser.user_id,
        status_revisao: REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE,
        admin_feedback: adminMessage,
        descricao: "Informações solicitadas pelo administrador.",
        // data_solicitacao é definida por default no BD com now()
      };
      console.log('[useUpdatePedidoAudioAndStatus] Tentando inserir solicitacao_revisao com dados:', JSON.stringify(solicitacaoData, null, 2));

      const { error: insertError } = await supabase
        .from('solicitacoes_revisao')
        .insert(solicitacaoData);

      if (insertError) {
        console.error('[useUpdatePedidoAudioAndStatus] Erro detalhado ao inserir solicitação de revisão:', JSON.stringify(insertError, null, 2));
        toast.error(
          `Erro ao registrar a solicitação de informação para o cliente: ${insertError.message}`
        );
        // Não vamos propagar o erro aqui para permitir que a atualização de status do pedido principal continue,
        // mas o admin precisa ser informado.
      } else {
        console.log('[useUpdatePedidoAudioAndStatus] Solicitação de revisão para Aguardando Cliente inserida com sucesso.');
        toast.info("Solicitação de informação registrada para o cliente.");
      }
    } else {
      console.error('[useUpdatePedidoAudioAndStatus] Não foi possível encontrar o user_id do pedido para criar a solicitação de revisão.');
      toast.error(
        "Não foi possível encontrar o usuário do pedido para registrar a solicitação de informação."
      );
    }
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