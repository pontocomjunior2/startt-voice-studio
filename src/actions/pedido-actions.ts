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
  audioGuiaRevisaoUrl: z.string().nullable().optional(),
});

// Definindo o tipo para o input da action com base no schema
// type SolicitarRevisaoInput = z.infer<typeof solicitarRevisaoSchema>; // Pode ser removido se não usado diretamente

export const solicitarRevisaoAction = actionClient
  .schema(solicitarRevisaoSchema)
  .action(async ({ parsedInput }) => {
    console.log('[solicitarRevisaoAction] Iniciando execução com input:', parsedInput);
    const { pedidoId, descricao, audioGuiaRevisaoUrl } = parsedInput;
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

      console.log(`[solicitarRevisaoAction] Inserindo solicitação de revisão com os seguintes dados: pedido_id=${pedidoId}, user_id=${userId}, status_revisao='solicitada', descricao_length=${descricao?.length || 0}`);
      const { data: insertData, error: insertSolicitacaoError } = await supabase
        .from('solicitacoes_revisao')
        .insert({
          pedido_id: pedidoId,
          user_id: userId,
          data_solicitacao: new Date().toISOString(),
          status_revisao: 'solicitada', 
          descricao: descricao,
          audio_guia_revisao_url: audioGuiaRevisaoUrl ?? null,
        })
        .select(); // Adicionar .select() para obter os dados inseridos ou um erro mais detalhado
      
      if (insertSolicitacaoError) {
        console.error("[solicitarRevisaoAction] ERRO AO CRIAR SOLICITAÇÃO DE REVISÃO (Supabase Error):", JSON.stringify(insertSolicitacaoError, null, 2));
        console.log(`[solicitarRevisaoAction] Tentando reverter status do pedido ${pedidoId} para ${PEDIDO_STATUS.CONCLUIDO}.`);
        const { error: revertError } = await supabase.from('pedidos').update({ status: PEDIDO_STATUS.CONCLUIDO }).eq('id', pedidoId);
        if (revertError) {
            console.error("[solicitarRevisaoAction] ERRO CRÍTICO AO TENTAR REVERTER o status do pedido:", JSON.stringify(revertError, null, 2));
        }
        return { failure: `Erro ao registrar a solicitação de revisão. Detalhes: ${insertSolicitacaoError.message}. O status do pedido pode não ter sido alterado corretamente.` };
      }

      if (!insertData || insertData.length === 0) {
        console.warn("[solicitarRevisaoAction] NENHUM DADO RETORNADO APÓS INSERT em solicitacoes_revisao, mas sem erro direto do Supabase. Isso pode indicar um problema de RLS ou configuração da tabela. Dados que seriam inseridos:", { pedido_id: pedidoId, user_id: userId, descricao_length: descricao?.length });
        // Ainda assim, vamos tentar reverter o status do pedido para CONCLUIDO, pois a revisão não foi confirmada.
        console.log(`[solicitarRevisaoAction] Revertendo status do pedido ${pedidoId} para ${PEDIDO_STATUS.CONCLUIDO} devido à ausência de dados de confirmação da revisão.`);
        const { error: revertErrorOnNoData } = await supabase.from('pedidos').update({ status: PEDIDO_STATUS.CONCLUIDO }).eq('id', pedidoId);
        if (revertErrorOnNoData) {
            console.error("[solicitarRevisaoAction] ERRO AO TENTAR REVERTER o status do pedido (no data case):", JSON.stringify(revertErrorOnNoData, null, 2));
        }
        return { failure: 'Falha ao confirmar o registro da solicitação de revisão. A operação foi cancelada.' };
      }
      
      console.log(`[solicitarRevisaoAction] Solicitação de revisão inserida com sucesso. Dados retornados: ${JSON.stringify(insertData, null, 2)}`);
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

export const excluirPedidoSchema = z.object({
  pedidoId: z.string().uuid({ message: "ID do pedido inválido." }),
});

export const excluirPedidoAction = actionClient
  .schema(excluirPedidoSchema)
  .action(async ({ parsedInput }) => {
    const { pedidoId } = parsedInput;
    let userId: string;

    try {
      userId = await getUserId();
    } catch (error: any) {
      console.error('[excluirPedidoAction] Falha ao autenticar usuário:', error.message);
      return { failure: error.message || 'Falha ao autenticar usuário para excluir o pedido.' };
    }

    try {
      console.log(`[excluirPedidoAction] Buscando pedido: ${pedidoId} para usuário: ${userId} para exclusão.`);
      const { data: pedido, error: fetchError } = await supabase
        .from('pedidos')
        .select('id, user_id, status')
        .eq('id', pedidoId)
        .single();

      if (fetchError) {
        console.error("[excluirPedidoAction] Erro ao buscar pedido para exclusão:", JSON.stringify(fetchError, null, 2));
        return { failure: "Pedido não encontrado ou erro ao buscar.", details: fetchError.message };
      }
      if (!pedido) {
        return { failure: "Pedido não encontrado." };
      }

      if (pedido.user_id !== userId) {
        console.warn(`[excluirPedidoAction] Tentativa de exclusão não autorizada. Usuário ${userId} tentou excluir pedido ${pedidoId} de ${pedido.user_id}.`);
        return { failure: "Você não tem permissão para excluir este pedido." };
      }

      if (pedido.status !== PEDIDO_STATUS.PENDENTE) {
        console.log(`[excluirPedidoAction] Tentativa de exclusão de pedido com status inválido: ${pedido.status}. Pedido: ${pedidoId}`);
        return { failure: `Este pedido não pode ser excluído pois seu status é "${pedido.status}". Apenas pedidos pendentes podem ser excluídos.` };
      }

      console.log(`[excluirPedidoAction] Chamando RPC excluir_pedido_e_estornar_creditos_real para o pedido: ${pedidoId}`);
      // Usar a nova função que realmente estorna créditos
      const { data: rpcResult, error: rpcError } = await supabase.rpc('excluir_pedido_e_estornar_creditos_real', {
        p_pedido_id: pedidoId
      });

      if (rpcError) {
        console.error("[excluirPedidoAction] Erro ao chamar RPC excluir_pedido_e_estornar_creditos_real:", JSON.stringify(rpcError, null, 2));
        return { failure: "Erro ao tentar comunicar com o serviço de exclusão.", details: rpcError.message };
      }

      console.log('[excluirPedidoAction] Resultado da RPC:', rpcResult);

      // A nova RPC retorna JSON diretamente
      const rpcResponse = rpcResult;

      if (!rpcResponse?.success) {
        console.error("[excluirPedidoAction] Erro retornado pela RPC excluir_pedido_e_estornar_creditos_real:", rpcResponse?.error);
        return { failure: rpcResponse?.error || "Falha ao excluir o pedido e estornar créditos." };
      }
      
      if (rpcResponse?.success) {
        console.log(`[excluirPedidoAction] Pedido ${pedidoId} excluído e créditos estornados com sucesso via RPC.`);
        return { success: true, message: rpcResponse.message || "Pedido excluído e créditos estornados.", pedidoId };
      }

      // Fallback para caso a resposta da RPC não seja o esperado
      console.warn("[excluirPedidoAction] Resposta inesperada da RPC:", rpcResult);
      return { failure: "Resposta inesperada do serviço de exclusão." };

    } catch (error: any) {
      console.error("[excluirPedidoAction] Erro inesperado na action:", JSON.stringify(error, null, 2));
      // Não retornar error.message diretamente para o cliente por segurança, a menos que seja um erro controlado.
      return { serverError: "Ocorreu um erro inesperado no servidor ao tentar excluir o pedido." };
    }
  });

// Schema para atualização de pedido
export const atualizarPedidoSchema = z.object({
  pedidoId: z.string().uuid("ID do pedido inválido."),
  titulo: z.string().min(3, "O título do pedido deve ter pelo menos 3 caracteres.").optional(),
  tipoAudio: z.enum(['off', 'produzido'], { required_error: 'Selecione o tipo de áudio.' }),
  locutorId: z.string().uuid("ID do locutor inválido."),
  textoRoteiro: z.string().min(10, "O roteiro deve ter pelo menos 10 caracteres."),
  estiloLocucao: z.string().min(1, "O estilo de locução é obrigatório."),
  // outrasObservacoesEstilo é tratado pela lógica que forma estiloLocucao (ex: "Outro: texto")
  orientacoes: z.string().optional(),
});

export const atualizarPedidoAction = actionClient
  .schema(atualizarPedidoSchema)
  .action(async ({ parsedInput }) => {
    const { pedidoId, ...dadosParaAtualizar } = parsedInput;
    let userId: string;

    try {
      userId = await getUserId();
    } catch (error: any) {
      console.error('[atualizarPedidoAction] Falha ao autenticar usuário:', error.message);
      return { failure: error.message || 'Falha ao autenticar usuário para atualizar o pedido.' };
    }

    try {
      console.log(`[atualizarPedidoAction] Buscando pedido ${pedidoId} para atualização pelo usuário ${userId}.`);
      const { data: pedidoExistente, error: fetchError } = await supabase
        .from('pedidos')
        .select('id, user_id, status')
        .eq('id', pedidoId)
        .single();

      if (fetchError || !pedidoExistente) {
        console.error("[atualizarPedidoAction] Erro ao buscar pedido ou pedido não encontrado:", JSON.stringify(fetchError, null, 2));
        return { failure: "Pedido não encontrado ou erro ao buscar para atualização." };
      }

      if (pedidoExistente.user_id !== userId) {
        console.warn(`[atualizarPedidoAction] Tentativa de atualização não autorizada. Usuário ${userId} tentou atualizar pedido ${pedidoId} de ${pedidoExistente.user_id}.`);
        return { failure: "Você não tem permissão para atualizar este pedido." };
      }

      if (pedidoExistente.status !== PEDIDO_STATUS.PENDENTE) {
        console.log(`[atualizarPedidoAction] Tentativa de atualização de pedido com status inválido: ${pedidoExistente.status}. Pedido: ${pedidoId}`);
        return { failure: `Este pedido não pode ser atualizado pois seu status é "${pedidoExistente.status}". Apenas pedidos pendentes podem ser modificados.` };
      }
      
      // Mapear os campos do schema para os nomes das colunas do BD.
      const dadosSupabase = {
        titulo: dadosParaAtualizar.titulo,
        tipo_audio: dadosParaAtualizar.tipoAudio,
        locutor_id: dadosParaAtualizar.locutorId,
        texto_roteiro: dadosParaAtualizar.textoRoteiro,
        estilo_locucao: dadosParaAtualizar.estiloLocucao,
        orientacoes: dadosParaAtualizar.orientacoes,
      };
    
      console.log(`[atualizarPedidoAction] Atualizando pedido ${pedidoId} com dados:`, JSON.stringify(dadosSupabase, null, 2));
    
      const { data: updatedData, error: updateError } = await supabase
        .from('pedidos')
        .update(dadosSupabase)
        .eq('id', pedidoId)
        .select() 
        .single();

      if (updateError) {
        console.error("[atualizarPedidoAction] Erro ao atualizar pedido:", JSON.stringify(updateError, null, 2));
        return { failure: `Erro ao tentar atualizar o pedido: ${updateError.message}` };
      }

      if (!updatedData) {
        console.warn("[atualizarPedidoAction] Nenhum dado retornado após a atualização, mas sem erro. Pedido ID:", pedidoId);
        // Isso pode acontecer se a query .update() não encontrar o registro para atualizar, 
        // embora a checagem anterior de pedidoExistente devesse cobrir isso.
        // Ou se o RLS impedir o retorno dos dados. Se a atualização for bem-sucedida mas nada for retornado,
        // pode ser ok prosseguir dependendo da política de RLS e do comportamento esperado.
        // Por segurança, vamos considerar um cenário onde a atualização pode não ter ocorrido como esperado se updatedData for null.
        return { failure: "Falha ao confirmar a atualização do pedido. Nenhum dado retornado."};
      }

      console.log(`[atualizarPedidoAction] Pedido ${pedidoId} atualizado com sucesso. Dados retornados:`, JSON.stringify(updatedData, null, 2));
      return { success: true, pedidoId: updatedData.id }; // Retornar o ID do pedido atualizado

    } catch (error: any) {
      console.error("[atualizarPedidoAction] Erro inesperado na action:", JSON.stringify(error, null, 2));
      return { serverError: "Ocorreu um erro inesperado no servidor ao tentar atualizar o pedido." };
    }
  });

// Schema para o admin marcar pedido como em análise
export const adminMarcarEmAnaliseSchema = z.object({
  pedidoId: z.string().uuid({ message: "ID do pedido inválido." }),
});

// Função placeholder para verificar se o usuário é admin
// Substitua pela sua lógica real de verificação de admin
const isAdmin = async (userId: string): Promise<boolean> => {
  // Exemplo: buscar o perfil do usuário e checar um campo 'role' ou 'is_admin'
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error || !profile) {
    console.warn('[isAdmin] Erro ao buscar perfil ou perfil não encontrado para userId:', userId, error);
    return false;
  }
  return profile.role === 'admin'; // Assumindo que existe uma coluna 'role' na tabela 'profiles'
};

export const adminMarcarPedidoEmAnaliseAction = actionClient
  .schema(adminMarcarEmAnaliseSchema)
  .action(async ({ parsedInput }) => {
    const { pedidoId } = parsedInput;
    let userId: string;

    try {
      userId = await getUserId();
    } catch (error: any) {
      console.error('[adminMarcarPedidoEmAnaliseAction] Falha ao autenticar usuário:', error.message);
      return { failure: error.message || 'Falha ao autenticar usuário.' };
    }

    try {
      const userIsAdmin = await isAdmin(userId);
      if (!userIsAdmin) {
        console.warn(`[adminMarcarPedidoEmAnaliseAction] Usuário ${userId} não é administrador.`);
        return { failure: "Apenas administradores podem executar esta ação." };
      }

      console.log(`[adminMarcarPedidoEmAnaliseAction] Admin ${userId} buscando pedido ${pedidoId} para marcar como EM_ANALISE.`);
      const { data: pedido, error: fetchError } = await supabase
        .from('pedidos')
        .select('id, status')
        .eq('id', pedidoId)
        .single();

      if (fetchError || !pedido) {
        console.error("[adminMarcarPedidoEmAnaliseAction] Erro ao buscar pedido ou pedido não encontrado:", JSON.stringify(fetchError, null, 2));
        return { failure: "Pedido não encontrado ou erro ao buscar." };
      }

      if (pedido.status !== PEDIDO_STATUS.PENDENTE) {
        console.log(`[adminMarcarPedidoEmAnaliseAction] Pedido ${pedidoId} não está PENDENTE. Status atual: ${pedido.status}.`);
        return { failure: `Este pedido não pode ser marcado como EM ANÁLISE, pois seu status atual é "${pedido.status}".` };
      }

      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ status: PEDIDO_STATUS.EM_ANALISE })
        .eq('id', pedidoId);

      if (updateError) {
        console.error("[adminMarcarPedidoEmAnaliseAction] Erro ao atualizar status do pedido para EM_ANALISE:", JSON.stringify(updateError, null, 2));
        return { failure: "Erro ao tentar atualizar o status do pedido.", details: updateError.message };
      }

      console.log(`[adminMarcarPedidoEmAnaliseAction] Pedido ${pedidoId} atualizado para EM_ANALISE com sucesso.`);
      return { success: true, message: "Pedido marcado como EM ANÁLISE.", pedidoId, novoStatus: PEDIDO_STATUS.EM_ANALISE };

    } catch (error: any) {
      console.error("[adminMarcarPedidoEmAnaliseAction] Erro inesperado na action:", JSON.stringify(error, null, 2));
      return { serverError: "Ocorreu um erro inesperado no servidor." };
    }
  }); 