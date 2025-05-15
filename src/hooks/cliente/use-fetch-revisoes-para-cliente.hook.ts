import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { REVISAO_STATUS_ADMIN, type SolicitacaoRevisaoParaCliente, type VersaoAudioRevisadoCliente } from '@/types/revisao.type';

const fetchRevisoesParaCliente = async (pedidoId: string): Promise<SolicitacaoRevisaoParaCliente[]> => {
  if (!pedidoId) {
    return [];
  }

  const { data: solicitacoes, error: solicitacoesError } = await supabase
    .from('solicitacoes_revisao')
    .select(`
      id,
      descricao,
      data_solicitacao,
      admin_feedback,
      data_conclusao_revisao,
      status_revisao,
      versoes_audio_revisao (
        id,
        audio_url,
        enviado_em,
        comentarios_admin,
        numero_versao
      )
    `)
    .eq('pedido_id', pedidoId)
    .eq('status_revisao', REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN)
    .order('data_solicitacao', { ascending: false })
    .order('numero_versao', { foreignTable: 'versoes_audio_revisao', ascending: true });

  if (solicitacoesError) {
    console.error('Erro ao buscar solicitações de revisão para o cliente:', solicitacoesError);
    throw new Error(solicitacoesError.message);
  }

  if (!solicitacoes) {
    return [];
  }

  // Mapear os dados para o tipo SolicitacaoRevisaoParaCliente
  const resultadoMapeado: SolicitacaoRevisaoParaCliente[] = solicitacoes.map((sol: any) => {
    const versoesAudioMapeadas: VersaoAudioRevisadoCliente[] = (sol.versoes_audio_revisao || []).map((ver: any) => ({
      id: ver.id,
      audioUrl: ver.audio_url,
      enviadoEm: ver.enviado_em,
      comentariosAdmin: ver.comentarios_admin,
      numeroVersao: ver.numero_versao,
    }));
    
    return {
      id: sol.id,
      descricaoCliente: sol.descricao, // Mapeado do alias 'descricao'
      dataSolicitacao: sol.data_solicitacao,
      adminFeedback: sol.admin_feedback,
      dataConclusaoRevisao: sol.data_conclusao_revisao,
      statusRevisao: sol.status_revisao as SolicitacaoRevisaoParaCliente['statusRevisao'],
      versoesAudio: versoesAudioMapeadas,
    };
  });

  return resultadoMapeado;
};

export const useFetchRevisoesParaCliente = (pedidoId: string | undefined) => {
  return useQuery({
    queryKey: ['revisoesCliente', pedidoId],
    queryFn: () => fetchRevisoesParaCliente(pedidoId!),
    enabled: !!pedidoId, // A query só será executada se pedidoId estiver definido
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });
}; 