'use server';

import { z } from 'zod';
import { createSafeActionClient } from 'next-safe-action';
import { supabase } from '@/lib/supabaseClient';
import { PEDIDO_STATUS } from '../types/pedido.type';
import type { TipoStatusPedido } from '../types/pedido.type';
// import { revalidatePath } from 'next/cache'; // Removido - não aplicável em ambiente Vite

// TODO: Configurar o auth() ou obter o usuário de alguma forma
// Exemplo básico, pode precisar de adaptação para sua autenticação
const getUserId = async () => {
  // const session = await auth(); // Se estiver usando NextAuth.js
  // if (!session?.user?.id) throw new Error('Usuário não autenticado');
  // return session.user.id;

  // Simulação enquanto não temos a autenticação integrada aqui:
  // Tentar pegar do Supabase Auth (se a action for chamada em um contexto autenticado)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    console.error("[pedido-actions] Usuário não autenticado na action.");
    throw new Error('Usuário não autenticado para esta ação.');
  }
  return user.id;
};

// Simplificando a inicialização do cliente
// Se precisar de tratamento de erro global ou metadados, será adicionado depois conforme a documentação.
export const actionClient = createSafeActionClient({
  // Configuração opcional para lidar com erros do servidor de forma global, se desejado.
  // Por enquanto, vamos tratar os erros dentro de cada action.
  // async handleServerError(error, utils) {
  //   console.error("SERVER ACTION ERROR:", error.message, { path: utils.path });
  //   return {
  //     serverError: "Ocorreu um erro no servidor. Tente novamente.",
  //   };
  // },
});

export const solicitarRevisaoSchema = z.object({
  pedidoId: z.string().uuid({ message: "ID do pedido inválido." }),
  descricao: z.string().min(1, { message: "A descrição da solicitação de revisão é obrigatória." }),
});

// Definindo o tipo para o input da action com base no schema
// type SolicitarRevisaoInput = z.infer<typeof solicitarRevisaoSchema>; // Pode ser removido se não usado diretamente

export const solicitarRevisaoAction = actionClient
  .schema(solicitarRevisaoSchema)
  .action(async ({ parsedInput }) => {
    console.log('[solicitarRevisaoAction] Iniciando execução com input:', parsedInput);
    const { pedidoId, descricao } = parsedInput;
    let userId: string;

    try {
      userId = await getUserId();
    } catch (error: any) {
      console.log('[solicitarRevisaoAction] Falha ao autenticar usuário.');
      return { failure: error.message || 'Falha ao autenticar usuário.' };
    }

    try {
      console.log(`[solicitarRevisaoAction] Buscando pedido: ${pedidoId} para usuário: ${userId}`);
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('status, user_id')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) {
        console.error("[solicitarRevisaoAction] Erro ao buscar pedido para revisão:", JSON.stringify(pedidoError, null, 2));
        return { failure: 'Pedido não encontrado ou erro ao buscar.' };
      }
      if (!pedido) {
        return { failure: 'Pedido não encontrado.' };
      }
      if (pedido.user_id !== userId) {
        return { failure: 'Você não tem permissão para solicitar revisão para este pedido.' };
      }
      if (pedido.status !== PEDIDO_STATUS.CONCLUIDO) {
        console.log(`[solicitarRevisaoAction] Retornando falha: Status do pedido inválido (${pedido.status}).`);
        return { failure: `Não é possível solicitar revisão para um pedido com status "${pedido.status}".` };
      }

      const novoStatusParaAtualizar: TipoStatusPedido = PEDIDO_STATUS.EM_REVISAO;
      console.log(`[solicitarRevisaoAction] Atualizando status do pedido para ${novoStatusParaAtualizar}.`);
      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({ status: novoStatusParaAtualizar })
        .eq('id', pedidoId);

      if (updatePedidoError) {
        console.error("[solicitarRevisaoAction] Erro ao atualizar status do pedido:", JSON.stringify(updatePedidoError, null, 2));
        return { failure: 'Erro ao atualizar o status do pedido.' };
      }

      console.log('[solicitarRevisaoAction] Inserindo solicitação de revisão.');
      const { error: insertSolicitacaoError } = await supabase
        .from('solicitacoes_revisao')
        .insert({
          pedido_id: pedidoId,
          user_id: userId,
          data_solicitacao: new Date().toISOString(),
          status_revisao: 'solicitada', // Status inicial da solicitação de revisão
          descricao: descricao,
        });
      
      if (insertSolicitacaoError) {
        console.error("[solicitarRevisaoAction] Erro detalhado ao criar solicitação de revisão:", JSON.stringify(insertSolicitacaoError, null, 2));
        console.log(`[solicitarRevisaoAction] Revertendo status do pedido para ${PEDIDO_STATUS.CONCLUIDO}.`);
        // Tenta reverter o status do pedido em caso de falha na inserção da solicitação
        const { error: revertError } = await supabase.from('pedidos').update({ status: PEDIDO_STATUS.CONCLUIDO }).eq('id', pedidoId);
        if (revertError) {
            console.error("[solicitarRevisaoAction] ERRO AO TENTAR REVERTER o status do pedido:", JSON.stringify(revertError, null, 2));
            // Mesmo que a reversão falhe, o erro principal é na criação da solicitação
        }
        return { failure: 'Erro ao registrar a solicitação de revisão. O status do pedido pode ter sido revertido.' };
      }
      
      console.log(`[solicitarRevisaoAction] Operações concluídas. Retornando sucesso com novoStatus: ${novoStatusParaAtualizar} para pedidoId: ${pedidoId}`);
      return { 
        success: 'Solicitação de revisão enviada com sucesso!', 
        pedidoId: pedidoId, 
        novoStatus: novoStatusParaAtualizar 
      };

    } catch (error: any) {
      console.error("[solicitarRevisaoAction] Erro inesperado na action:", JSON.stringify(error, null, 2));
      return { failure: 'Ocorreu um erro inesperado ao processar sua solicitação.' };
    }
  }); 