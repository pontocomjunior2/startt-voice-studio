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
    .optional(),
  novoStatusRevisao: z.enum(
    [
      REVISAO_STATUS_ADMIN.SOLICITADA,
      REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN,
      REVISAO_STATUS_ADMIN.AGUARDANDO_UPLOAD_ADMIN,
      REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN,
      REVISAO_STATUS_ADMIN.NEGADA
    ],
    {
      required_error: "O novo status da revisão é obrigatório.",
      invalid_type_error: "Status de revisão inválido."
    }
  ),
});

// O middleware de verificação de admin será chamado no início da action.
const actionClientAdmin = createSafeActionClient({
  // Esta função é chamada no servidor se a action lançar um erro não capturado internamente.
  // Útil para logging centralizado de erros inesperados antes que uma resposta genérica seja enviada.
  handleServerError(e: Error) {
    console.error("🔴 Erro não capturado na Server Action (handleServerError):", e);
    // Esta função normalmente não retorna um valor que altera a resposta ao cliente,
    // ela é para side-effects como logging. O cliente receberá um erro genérico
    // se a action falhar sem retornar um objeto de erro estruturado.
    // Para o erro ACESSO_NEGADO_ADMIN, já estamos retornando um objeto estruturado.
  },
});

export const processarRevisaoAdminAction = actionClientAdmin
  .schema(processarRevisaoAdminSchema)
  .action(async ({ parsedInput }) => {
    // PASSO 0: Verificar se é admin
    const isAdmin = await verificarAdminRole();
    if (!isAdmin) {
      console.warn("[processarRevisaoAdminAction] Tentativa de execução por não admin.");
      return { serverError: "ACESSO_NEGADO_ADMIN" }; 
    }

    const { solicitacaoId, adminFeedback, audioFile, novoStatusRevisao } = parsedInput;
    
    console.log(`[processarRevisaoAdminAction] Iniciando para solicitação ID: ${solicitacaoId} com novo status: ${novoStatusRevisao}`);
    if (audioFile) {
      console.log(`[processarRevisaoAdminAction] Nome do arquivo: ${audioFile.name}, Tamanho: ${audioFile.size}, Tipo: ${audioFile.type}`);
    } else {
      console.log(`[processarRevisaoAdminAction] Nenhum arquivo de áudio fornecido.`);
    }

    const { data: solicitacaoData, error: solicitacaoError } = await supabase
      .from('solicitacoes_revisao')
      .select('pedido_id, status_revisao')
      .eq('id', solicitacaoId)
      .single();

    if (solicitacaoError || !solicitacaoData) {
      console.error('[processarRevisaoAdminAction] Erro ao buscar solicitação:', solicitacaoError);
      return { failure: 'Solicitação de revisão não encontrada.' };
    }
    const { pedido_id: pedidoId, status_revisao: statusAtualRevisao } = solicitacaoData;
    console.log(`[processarRevisaoAdminAction] Pedido ID associado: ${pedidoId}, Status Atual Revisão: ${statusAtualRevisao}`);

    if (statusAtualRevisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || statusAtualRevisao === REVISAO_STATUS_ADMIN.NEGADA) {
        console.warn(`[processarRevisaoAdminAction] Tentativa de processar solicitação que já está '${statusAtualRevisao}'.`);
        return { failure: `Esta solicitação de revisão já foi processada (status: ${statusAtualRevisao}).`};
    }

    // --- INÍCIO DA LÓGICA REESTRUTURADA ---

    if (novoStatusRevisao === REVISAO_STATUS_ADMIN.NEGADA) {
      console.log(`[processarRevisaoAdminAction] FLUXO: REVISÃO NEGADA para solicitação ID: ${solicitacaoId}`);
      if (audioFile) {
        console.warn('[processarRevisaoAdminAction:NEGADA] Arquivo de áudio fornecido para negação, será ignorado.');
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
        console.error('[processarRevisaoAdminAction:NEGADA] Erro ao atualizar solicitação:', updateSolicitacaoError);
        return { failure: 'Erro ao marcar a revisão como negada.' };
      }

      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({ status: PEDIDO_STATUS.CONCLUIDO })
        .eq('id', pedidoId);

      if (updatePedidoError) {
        console.error('[processarRevisaoAdminAction:NEGADA] Erro ao atualizar pedido principal:', updatePedidoError);
        // Considerar rollback do status da solicitação aqui para consistência
        return { failure: 'Revisão negada, mas falha ao atualizar status do pedido principal.' };
      }
      return { success: 'Revisão marcada como negada e feedback enviado ao cliente.' };

    } else if (novoStatusRevisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN) {
      console.log(`[processarRevisaoAdminAction] FLUXO: REVISÃO CONCLUÍDA para solicitação ID: ${solicitacaoId}`);
      let audioUrlRevisadoDb = null;
      let nomeArquivoDb = null;
      let uploadPathParaRollback = null;

      if (audioFile) {
        console.log(`[processarRevisaoAdminAction:CONCLUIDA] Processando com arquivo: ${audioFile.name}`);
        const timestamp = Date.now();
        const filePath = `public/revisoes/${pedidoId}/${solicitacaoId}/${timestamp}-${audioFile.name}`;
        uploadPathParaRollback = filePath; // Guardar para possível rollback

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audios-revisados').upload(filePath, audioFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('[processarRevisaoAdminAction:CONCLUIDA] Erro upload:', uploadError);
          return { failure: `Erro upload: ${uploadError.message}` };
        }
        if (!uploadData) { 
            return { failure: 'Falha upload, resposta inesperada.' };
        }
        
        const { data: publicUrlData } = supabase.storage.from('audios-revisados').getPublicUrl(uploadData.path);
        if (!publicUrlData || !publicUrlData.publicUrl) {
          await supabase.storage.from('audios-revisados').remove([uploadData.path]);
          return { failure: 'Erro obter URL pública.' };
        }
        audioUrlRevisadoDb = publicUrlData.publicUrl;
        nomeArquivoDb = audioFile.name;
        console.log(`[processarRevisaoAdminAction:CONCLUIDA] Upload OK: ${audioUrlRevisadoDb}`);

        const { error: insertVersaoError } = await supabase.from('versoes_audio_revisado').insert({
          solicitacao_id: solicitacaoId, audio_url_revisado: audioUrlRevisadoDb, 
          nome_arquivo_revisado: nomeArquivoDb, comentario_admin: adminFeedback,
          data_envio: new Date().toISOString(),
        });

        if (insertVersaoError) {
          console.error('[processarRevisaoAdminAction:CONCLUIDA] Erro insert versoes_audio_revisado:', insertVersaoError);
          if (uploadPathParaRollback) await supabase.storage.from('audios-revisados').remove([uploadPathParaRollback]);
          return { failure: 'Erro salvar detalhes áudio.' };
        }
        console.log('[processarRevisaoAdminAction:CONCLUIDA] DB versoes_audio_revisado OK.');
      } else {
        console.log('[processarRevisaoAdminAction:CONCLUIDA] Processando sem arquivo de áudio.');
      }

      const { error: updateSolicitacaoError } = await supabase.from('solicitacoes_revisao').update({
        status_revisao: REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN,
        admin_feedback: adminFeedback,
        data_conclusao_revisao: new Date().toISOString(),
      }).eq('id', solicitacaoId);

      if (updateSolicitacaoError) {
        console.error('[processarRevisaoAdminAction:CONCLUIDA] Erro update solicitacoes_revisao:', updateSolicitacaoError);
        if (uploadPathParaRollback) { /* TODO: Tentar deletar de versoes_audio_revisado também */ await supabase.storage.from('audios-revisados').remove([uploadPathParaRollback]);}
        return { failure: 'Erro finalizar solicitação.' };
      }
      console.log('[processarRevisaoAdminAction:CONCLUIDA] DB solicitacoes_revisao OK.');

      const { error: updatePedidoError } = await supabase.from('pedidos').update({ 
        status: PEDIDO_STATUS.CONCLUIDO 
        // Se o audioUrlRevisadoDb existir e for para atualizar o pedido principal:
        // ...(audioUrlRevisadoDb && { audio_final_url: audioUrlRevisadoDb })
      }).eq('id', pedidoId);

      if (updatePedidoError) {
        console.error('[processarRevisaoAdminAction:CONCLUIDA] Erro update pedidos:', updatePedidoError);
        // Rollback mais complexo aqui: reverter status da solicitação, deletar de versoes_audio_revisado, remover do storage.
        return { failure: 'Revisão OK, mas falha atualizar pedido principal.' };
      }
      console.log('[processarRevisaoAdminAction:CONCLUIDA] DB pedidos OK.');
      return { success: `Revisão concluída. ${audioFile ? 'Áudio enviado.' : 'Feedback enviado.'}` };

    } else if (novoStatusRevisao === REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN || novoStatusRevisao === REVISAO_STATUS_ADMIN.AGUARDANDO_UPLOAD_ADMIN) {
      console.log(`[processarRevisaoAdminAction] FLUXO: ATUALIZAR STATUS INTERMEDIÁRIO para ${novoStatusRevisao}, ID: ${solicitacaoId}`);
      if (audioFile) {
        console.warn(`[processarRevisaoAdminAction:INTERMEDIARIO] Arquivo de áudio fornecido para status ${novoStatusRevisao}, será ignorado.`);
      }
      const { error: updateSolicitacaoError } = await supabase.from('solicitacoes_revisao').update({
        status_revisao: novoStatusRevisao,
        admin_feedback: adminFeedback,
        // data_conclusao_revisao não é preenchida para status intermediários
      }).eq('id', solicitacaoId);

      if (updateSolicitacaoError) {
        console.error(`[processarRevisaoAdminAction:INTERMEDIARIO] Erro ao atualizar solicitação para ${novoStatusRevisao}:`, updateSolicitacaoError);
        return { failure: `Erro ao atualizar status da revisão para ${novoStatusRevisao}.` };
      }
      // O status do pedido principal (pedidos.status) não muda para status intermediários da revisão.
      return { success: `Status da revisão atualizado para ${novoStatusRevisao}.` };

    } else {
      console.warn(`[processarRevisaoAdminAction] Status não esperado ou inválido: '${novoStatusRevisao}'.`);
      return { failure: `Status de revisão '${novoStatusRevisao}' não é um fluxo de processamento válido nesta ação.` };
    }
    // --- FIM DA LÓGICA REESTRUTURADA ---
  }); 