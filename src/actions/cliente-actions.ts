'use server';

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import { PEDIDO_STATUS } from "@/types/pedido.type";
import { REVISAO_STATUS_ADMIN } from "@/types/revisao.type";

const actionClient = createSafeActionClient();

const responderInfoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  respostaCliente: z.string().min(10, { message: "Sua resposta precisa ter pelo menos 10 caracteres." }),
});

export const clienteResponderInfoAction = actionClient
  .schema(responderInfoSchema)
  .action(async ({ parsedInput }) => {
    const { solicitacaoId, respostaCliente } = parsedInput;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    // 1. Encontrar a solicitação de revisão
    const { data: solicitacao, error: solicitacaoError } = await supabase
      .from('solicitacoes_revisao')
      .select('id, pedido_id, user_id, status_revisao')
      .eq('id', solicitacaoId)
      .single();

    if (solicitacaoError || !solicitacao) {
      return { failure: "Solicitação de revisão não encontrada." };
    }

    if (solicitacao.user_id !== user.id) {
      return { failure: "Você não tem permissão para responder a esta solicitação." };
    }

    if (solicitacao.status_revisao !== REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) {
      return { failure: "Esta solicitação não está mais aguardando sua resposta." };
    }

    // 2. Atualizar a solicitação de revisão com a resposta
    const { error: updateSolicitacaoError } = await supabase
      .from('solicitacoes_revisao')
      .update({
        cliente_resposta_info: respostaCliente,
        data_resposta_cliente: new Date().toISOString(),
        status_revisao: REVISAO_STATUS_ADMIN.CLIENTE_RESPONDEU,
      })
      .eq('id', solicitacaoId);

    if (updateSolicitacaoError) {
      console.error("Erro ao atualizar a solicitação com a resposta do cliente:", updateSolicitacaoError);
      return { failure: "Não foi possível salvar sua resposta." };
    }

    // 3. Atualizar o status do pedido principal para notificar o admin
    const { error: updatePedidoError } = await supabase
      .from('pedidos')
      .update({ status: PEDIDO_STATUS.EM_ANALISE })
      .eq('id', solicitacao.pedido_id);

    if (updatePedidoError) {
      console.error("Erro ao atualizar o status do pedido principal para EM_ANALISE:", updatePedidoError);
      return { failure: "Sua resposta foi salva, mas não foi possível notificar o administrador." };
    }
    
    return { success: "Sua resposta foi enviada com sucesso e o administrador foi notificado." };
  }); 