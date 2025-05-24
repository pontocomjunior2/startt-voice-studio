import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { SolicitacaoRevisaoDetalhada } from '../../types/pedido.type';

const fetchSolicitacoesRevisaoDetalhadasPorPedido = async (pedidoId: string | null): Promise<SolicitacaoRevisaoDetalhada[]> => {
  if (!pedidoId) return []; // Retorna array vazio se não houver pedidoId

  const { data, error } = await supabase
    .from('solicitacoes_revisao')
    .select(`
      id,
      pedido_id,
      user_id,
      descricao_cliente:descricao,
      data_solicitacao,
      status_revisao,
      admin_feedback,
      data_conclusao_revisao,
      versoes_audio_revisao (
        id,
        audio_url_revisado:audio_url,
        data_envio:enviado_em,
        comentario_admin:comentarios_admin
      )
    `)
    .eq('pedido_id', pedidoId)
    .order('data_solicitacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar solicitações de revisão detalhadas por pedido:', error);
    // Considerar lançar o erro ou retornar um objeto de erro para tratamento na UI
    throw new Error(error.message || 'Não foi possível buscar o histórico de revisões do pedido.');
  }

  // O Supabase já deve retornar 'versoes_audio_revisao' como um array aninhado.
  // Se 'descricao' foi renomeada para 'descricao_cliente' na query, o mapeamento é direto.
  // É importante que os nomes das colunas no select string correspondam aos campos de SolicitacaoRevisaoDetalhada e VersaoAudioRevisadoDetalhada
  return (data || []).map(item => ({ ...item, descricao: item.descricao_cliente ?? '' }));
};

interface UseFetchSolicitacoesRevisaoDetalhadasPorPedidoOptions {
  pedidoId: string | null;
  enabled?: boolean; // Permitir controle externo da execução da query
}

export const useFetchSolicitacoesRevisaoDetalhadasPorPedido = ({ pedidoId, enabled = true }: UseFetchSolicitacoesRevisaoDetalhadasPorPedidoOptions) => {
  return useQuery<SolicitacaoRevisaoDetalhada[], Error>(
    {
      queryKey: ['solicitacoesRevisaoDetalhadasPorPedido', pedidoId],
      queryFn: () => fetchSolicitacoesRevisaoDetalhadasPorPedido(pedidoId),
      enabled: !!pedidoId && enabled, // Só ativa se pedidoId existir e enabled for true
    }
  );
}; 