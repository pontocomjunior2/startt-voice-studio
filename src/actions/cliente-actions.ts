'use server';

import { z } from 'zod';
import { createSafeActionClient } from 'next-safe-action';
import { supabase } from '@/lib/supabaseClient';
import { PEDIDO_STATUS } from '@/types/pedido.type';
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type'; // Usaremos CLIENTE_RESPONDEU daqui

const actionClient = createSafeActionClient();

export const clienteResponderInfoSchema = z.object({
  solicitacaoId: z.string().uuid("ID da solicitação inválido."),
  respostaCliente: z.string().min(1, "A resposta não pode estar vazia.").max(2000, "A resposta não pode exceder 2000 caracteres."),
  pedidoId: z.string().uuid("ID do pedido inválido."),
});

export const clienteResponderInfoAction = actionClient
  .schema(clienteResponderInfoSchema)
  .action(async ({ parsedInput }) => {
    const { solicitacaoId, respostaCliente, pedidoId } = parsedInput;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { failure: 'Usuário não autenticado.' };
    }

    // Verificar se a solicitação pertence ao usuário e ao pedido corretos
    const { data: solicitacaoData, error: solicitacaoError } = await supabase
      .from('solicitacoes_revisao')
      .select('id, user_id, pedido_id, status_revisao')
      .eq('id', solicitacaoId)
      .eq('pedido_id', pedidoId)
      .eq('user_id', user.id)
      .single();

    if (solicitacaoError || !solicitacaoData) {
      console.error('[clienteResponderInfoAction] Erro ao buscar solicitação ou não pertence ao usuário/pedido:', solicitacaoError);
      return { failure: 'Solicitação de revisão não encontrada ou acesso negado.' };
    }

    if (solicitacaoData.status_revisao !== REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) {
      return { failure: 'Esta solicitação não está aguardando sua resposta.' };
    }

    const updatesSolicitacao = {
      cliente_info_response_details: respostaCliente,
      status_revisao: REVISAO_STATUS_ADMIN.CLIENTE_RESPONDEU,
      data_cliente_respondeu_info: new Date().toISOString(),
      data_ultima_atualizacao: new Date().toISOString(),
    };

    const { error: updateSolError } = await supabase
      .from('solicitacoes_revisao')
      .update(updatesSolicitacao)
      .eq('id', solicitacaoId);

    if (updateSolError) {
      console.error('[clienteResponderInfoAction] Erro ao atualizar solicitação de revisão:', updateSolError);
      return { failure: `Erro ao salvar sua resposta: ${updateSolError.message}` };
    }

    // Atualizar o status do pedido principal para EM_REVISAO
    const { error: updatePedidoError } = await supabase
      .from('pedidos')
      .update({ 
        status: PEDIDO_STATUS.EM_REVISAO,
        // Poderíamos também atualizar uma data de "última interação do cliente" no pedido se existisse
      })
      .eq('id', pedidoId);

    if (updatePedidoError) {
      console.error('[clienteResponderInfoAction] Erro ao atualizar status do pedido principal:', updatePedidoError);
      // Não vamos falhar a action inteira aqui, mas logar o erro é importante.
      // A resposta do cliente na solicitação foi salva, o que é o principal.
      // O admin verá o status CLIENTE_RESPONDEU na revisão de qualquer forma.
    }

    return { success: 'Resposta enviada com sucesso.', solicitacaoId, novoStatusRevisao: REVISAO_STATUS_ADMIN.CLIENTE_RESPONDEU, pedidoId, novoStatusPedido: PEDIDO_STATUS.EM_REVISAO };
  }); 