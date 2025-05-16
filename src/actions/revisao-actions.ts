'use server';

import { z } from 'zod';
import { createSafeActionClient } from 'next-safe-action';
import { supabase } from '@/lib/supabaseClient';
import { PEDIDO_STATUS } from '@/types/pedido.type';
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type';

const verificarAdminRole = async () => { 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[verificarAdminRole] Usuário não autenticado.');
    return false;
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[verificarAdminRole] Erro ao buscar perfil:', error);
    return false;
  }
  if (!profile) {
    console.log('[verificarAdminRole] Perfil não encontrado para o usuário.');
    return false;
  }
  
  const isAdmin = profile.role === 'admin';
  console.log(`[verificarAdminRole] Usuário ${user.id} é admin: ${isAdmin}`);
  return isAdmin;
};

export const processarRevisaoAdminSchema = z.object({
  solicitacaoId: z.string().uuid({ message: "ID da solicitação inválido." }),
  adminFeedback: z.string().optional(),
  audioFile: z
    .instanceof(File, { message: "Arquivo de áudio é obrigatório." })
    .refine((file) => file.size > 0, { message: "Arquivo de áudio não pode estar vazio." })
    .refine((file) => file.type.startsWith('audio/'), { message: "Arquivo deve ser um áudio." })
    .nullable()
    .optional(),
  novoStatusRevisao: z.enum(
    [
      REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN,
      REVISAO_STATUS_ADMIN.REVISADO_FINALIZADO,
      REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE,
      REVISAO_STATUS_ADMIN.NEGADA,
      REVISAO_STATUS_ADMIN.CLIENTE_RESPONDEU
    ],
    {
      required_error: "O novo status da revisão é obrigatório.",
      invalid_type_error: "Status de revisão inválido."
    }
  ),
});

const actionClientAdmin = createSafeActionClient({
  handleServerError(e: Error) {
    console.error("🔴 Erro não capturado na Server Action (handleServerError):", e);
    return { serverError: `Erro inesperado no servidor: ${e.message}` };
  },
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const processarRevisaoAdminAction = actionClientAdmin
  .schema(processarRevisaoAdminSchema)
  .action(async ({ parsedInput }) => {
    const isAdmin = await verificarAdminRole();
    if (!isAdmin) {
      console.warn("[processarRevisaoAdminAction] Tentativa de execução por não admin.");
      return { serverError: "ACESSO_NEGADO_ADMIN" }; 
    }

    const { solicitacaoId, adminFeedback, audioFile, novoStatusRevisao } = parsedInput;
    
    console.log(`[Action processarRevisaoAdmin] Iniciando para solicitação ID: ${solicitacaoId} com novo status: ${novoStatusRevisao}`);
    if (audioFile) {
      console.log(`[Action processarRevisaoAdmin] Arquivo fornecido: ${audioFile.name}, Tamanho: ${audioFile.size}, Tipo: ${audioFile.type}`);
    } else {
      console.log(`[Action processarRevisaoAdmin] Nenhum arquivo de áudio fornecido para esta ação.`);
    }

    const { data: solicitacaoData, error: solicitacaoError } = await supabase
      .from('solicitacoes_revisao')
      .select('pedido_id, status_revisao, user_id')
      .eq('id', solicitacaoId)
      .single();

    if (solicitacaoError || !solicitacaoData) {
      console.error('[Action processarRevisaoAdmin] Erro ao buscar solicitação:', solicitacaoError);
      return { failure: 'Solicitação de revisão não encontrada.' };
    }
    const { pedido_id: pedidoId, status_revisao: statusAtualRevisao, user_id: clienteUserId } = solicitacaoData;
    console.log(`[Action processarRevisaoAdmin] Pedido ID: ${pedidoId}, Cliente User ID: ${clienteUserId}, Status Atual: ${statusAtualRevisao}`);

    if (!clienteUserId) {
        console.error('[Action processarRevisaoAdmin] User ID do cliente não encontrado na solicitação.');
        return { failure: 'User ID do cliente não encontrado.' };
    }

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', clienteUserId)
        .single();

    if (profileError || !profileData || !profileData.username) {
        console.error('[Action processarRevisaoAdmin] Erro ao buscar username do cliente:', profileError);
        return { failure: 'Não foi possível encontrar o username do cliente.' };
    }
    const clientUsername = profileData.username;
    console.log(`[Action processarRevisaoAdmin] Username do cliente: ${clientUsername}`);

    if (statusAtualRevisao === REVISAO_STATUS_ADMIN.REVISADO_FINALIZADO || statusAtualRevisao === REVISAO_STATUS_ADMIN.NEGADA) {
        console.warn(`[Action processarRevisaoAdmin] Tentativa de processar solicitação que já está '${statusAtualRevisao}'.`);
        return { failure: `Esta solicitação de revisão já foi processada (status: ${statusAtualRevisao}).`};
    }

    if (novoStatusRevisao === REVISAO_STATUS_ADMIN.REVISADO_FINALIZADO) {
      if (!audioFile) {
        console.error('[Action processarRevisaoAdmin:REVISADO_FINALIZADO] Arquivo de áudio não fornecido, mas é obrigatório para este status.');
        return { failure: 'Arquivo de áudio é obrigatório para marcar a revisão como finalizada.' };
      }
      console.log(`[Action processarRevisaoAdmin] FLUXO: REVISADO_FINALIZADO COM ARQUIVO. Enviando para API Route...`);
      
      const formData = new FormData();
      formData.append('revisaoAudioFile', audioFile);
      formData.append('solicitacaoId', solicitacaoId);
      formData.append('adminFeedback', adminFeedback || '');
      formData.append('novoStatusRevisao', novoStatusRevisao);
      formData.append('clientUsername', clientUsername); 
      formData.append('pedidoId', pedidoId); 

      try {
        const apiUrlComUsername = `${API_URL}/api/revisoes/processar-upload/${encodeURIComponent(clientUsername)}`;
        console.log(`[Action processarRevisaoAdmin] Chamando API: ${apiUrlComUsername}`);
        const response = await fetch(apiUrlComUsername, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error('[Action processarRevisaoAdmin] Falha na API de upload:', result);
          return { failure: result.failure || `Erro na API de upload (${response.status}): ${response.statusText}` };
        }
        console.log('[Action processarRevisaoAdmin] Sucesso na API de upload (REVISADO_FINALIZADO):', result);
        return { success: result.message || 'Revisão processada e áudio salvo com sucesso.' };

      } catch (fetchError: any) {
        console.error('[Action processarRevisaoAdmin] Erro no fetch para API de upload:', fetchError);
        return { failure: `Erro de comunicação com o servidor de upload: ${fetchError.message}` };
      }
    } else if (novoStatusRevisao === REVISAO_STATUS_ADMIN.NEGADA) {
      console.log(`[Action processarRevisaoAdmin] FLUXO: REVISÃO NEGADA.`);
      if (audioFile) {
        console.warn('[Action processarRevisaoAdmin:NEGADA] Arquivo de áudio fornecido para negação, será ignorado.');
      }
      if (!adminFeedback || adminFeedback.trim() === '') {
        return { failure: 'Feedback do administrador é obrigatório ao negar uma revisão.' };
      }

      const { error: updateSolicitacaoError } = await supabase
        .from('solicitacoes_revisao')
        .update({
          status_revisao: REVISAO_STATUS_ADMIN.NEGADA,
          admin_feedback: adminFeedback,
          data_conclusao_revisao: new Date().toISOString(),
        })
        .eq('id', solicitacaoId);

      if (updateSolicitacaoError) {
        console.error('[Action processarRevisaoAdmin:NEGADA] Erro ao atualizar solicitação:', updateSolicitacaoError);
        return { failure: `Erro ao marcar a revisão como negada: ${updateSolicitacaoError.message}` };
      }

      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({ status: PEDIDO_STATUS.CONCLUIDO })
        .eq('id', pedidoId);

      if (updatePedidoError) {
        console.error('[Action processarRevisaoAdmin:NEGADA] Erro ao atualizar pedido principal para CONCLUÍDO:', updatePedidoError);
      }
      return { success: 'Revisão marcada como negada e feedback enviado ao cliente.' };
    } else if (novoStatusRevisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) {
      console.log(`[Action processarRevisaoAdmin] FLUXO: INFO_SOLICITADA_AO_CLIENTE.`);
      if (audioFile) {
        console.warn('[Action processarRevisaoAdmin:INFO_SOLICITADA] Arquivo de áudio fornecido, será ignorado.');
      }
      if (!adminFeedback || adminFeedback.trim() === '') {
        return { failure: 'Feedback do administrador é obrigatório ao solicitar mais informações.' };
      }

      const { error: updateSolError } = await supabase
        .from('solicitacoes_revisao')
        .update({
          status_revisao: REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE,
          admin_feedback: adminFeedback,
          admin_info_request_details: adminFeedback,
        })
        .eq('id', solicitacaoId);
      
      if (updateSolError) {
        console.error(`[Action processarRevisaoAdmin:INFO_SOLICITADA] Erro ao atualizar status:`, updateSolError);
        return { failure: `Erro ao solicitar mais informações: ${updateSolError.message}` };
      }

      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({ status: PEDIDO_STATUS.AGUARDANDO_CLIENTE })
        .eq('id', pedidoId);

      if (updatePedidoError) {
        console.error('[Action processarRevisaoAdmin:INFO_SOLICITADA] Erro ao atualizar pedido principal para AGUARDANDO_CLIENTE:', updatePedidoError);
      }
      return { success: 'Status da revisão atualizado para "Informações Solicitadas ao Cliente". O pedido principal está aguardando o cliente.' };
    } else if (novoStatusRevisao === REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN) {
      console.log(`[Action processarRevisaoAdmin] FLUXO: EM_ANDAMENTO_ADMIN.`);
      if (audioFile) {
        console.warn('[Action processarRevisaoAdmin:EM_ANDAMENTO_ADMIN] Arquivo de áudio fornecido, será ignorado, pois este status é intermediário.');
      }
      const { error: updateSolError } = await supabase
        .from('solicitacoes_revisao')
        .update({
          status_revisao: REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN,
          admin_feedback: adminFeedback || undefined, 
        })
        .eq('id', solicitacaoId);

      if (updateSolError) {
        console.error(`[Action processarRevisaoAdmin:EM_ANDAMENTO_ADMIN] Erro ao atualizar status:`, updateSolError);
        return { failure: `Erro ao atualizar status da solicitação para "Em Andamento": ${updateSolError.message}` };
      }
      
      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({ status: PEDIDO_STATUS.EM_REVISAO }) 
        .eq('id', pedidoId);
      
      if (updatePedidoError) {
         console.error('[Action processarRevisaoAdmin:EM_ANDAMENTO_ADMIN] Erro ao garantir que o pedido principal está EM_REVISAO:', updatePedidoError);
      }
      return { success: 'Status da revisão atualizado para "Em Andamento pelo Admin".' };
    } else {
        console.warn(`[Action processarRevisaoAdmin] Combinação não tratada ou status inesperado: status ${novoStatusRevisao} com audioFile ${audioFile ? 'presente' : 'ausente'}`);
        return { failure: 'Ação não permitida ou combinação de status e arquivo inválida.' };
    }
  }); 