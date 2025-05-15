import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ajuste o caminho se necessário
import type { SolicitacaoRevisaoAdmin, TipoRevisaoStatusAdmin } from '@/types/revisao.type'; // Ajuste o caminho
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type'; // Ajuste o caminho
import type { TipoStatusPedido } from '@/types/pedido.type'; // Importar TipoStatusPedido do local correto

interface UseFetchAdminSolicitacoesRevisaoOptions {
  status?: TipoRevisaoStatusAdmin;
}

export function useFetchAdminSolicitacoesRevisao(options?: UseFetchAdminSolicitacoesRevisaoOptions) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRevisaoAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSolicitacoes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('solicitacoes_revisao')
        .select(`
          id_solicitacao:id,
          data_solicitacao,
          status_revisao,
          descricao_cliente:descricao,
          pedidos ( 
            pedido_id:id,
            id_pedido_serial,
            pedido_status_atual:status,
            pedido_titulo:titulo,
            pedido_audio_original_url:audio_final_url,
            profiles!user_id ( 
              cliente_user_id:id,
              cliente_nome:full_name
            )
          )
        `)
        .order('data_solicitacao', { ascending: true });

      if (options?.status) {
        query = query.eq('status_revisao', options.status);
      } else {
        query = query.eq('status_revisao', REVISAO_STATUS_ADMIN.SOLICITADA);
      }
      
      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedData: SolicitacaoRevisaoAdmin[] = data.map((item: any) => ({
        id_solicitacao: item.id_solicitacao,
        data_solicitacao: item.data_solicitacao,
        status_revisao: item.status_revisao,
        descricao_cliente: item.descricao_cliente,
        pedido_id: item.pedidos.pedido_id,
        pedido_id_serial: item.pedidos.id_pedido_serial,
        pedido_status_atual: item.pedidos.pedido_status_atual as TipoStatusPedido,
        pedido_titulo: item.pedidos.pedido_titulo,
        pedido_audio_original_url: item.pedidos.pedido_audio_original_url,
        cliente_user_id: item.pedidos.profiles.cliente_user_id,
        cliente_nome: item.pedidos.profiles.cliente_nome,
      }));
      
      setSolicitacoes(mappedData);

    } catch (err: any) {
      console.error("Erro ao buscar solicitações de revisão para admin:", err);
      setError(err.message || "Falha ao buscar solicitações de revisão.");
    } finally {
      setIsLoading(false);
    }
  }, [options?.status]);

  useEffect(() => {
    fetchSolicitacoes();
  }, [fetchSolicitacoes]);

  return { solicitacoes, isLoading, error, refreshSolicitacoes: fetchSolicitacoes };
} 