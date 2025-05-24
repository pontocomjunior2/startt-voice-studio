import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Pedido } from '@/types/pedido.type';
import type { SolicitacaoRevisaoParaCliente } from '@/types/revisao.type'; // Tipos corretos
import { useQueryClient } from '@tanstack/react-query';

export interface PedidoComRevisoesRealtimeData {
  pedido: Pedido | null;
  revisoes: SolicitacaoRevisaoParaCliente[] | null;
}

export const usePedidoComRevisoesRealtime = (pedidoId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const [pedidoData, setPedidoData] = useState<PedidoComRevisoesRealtimeData>({
    pedido: null,
    revisoes: null,
  });
  const [loadingRealtime, setLoadingRealtime] = useState(true);
  const [errorRealtime, setErrorRealtime] = useState<string | null>(null);

  const fetchInitialData = useCallback(async (currentPedidoId: string) => {
    setLoadingRealtime(true);
    setErrorRealtime(null);
    try {
      // 1. Buscar dados do pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select(`
          *,
          admin_cancel_reason,
          locutores ( nome )
        `)
        .eq('id', currentPedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      // 2. Buscar solicitações de revisão
      const { data: revisoes, error: revisoesError } = await supabase
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
        .eq('pedido_id', currentPedidoId)
        .order('data_solicitacao', { ascending: false });

      if (revisoesError) throw revisoesError;
      
      // Mapear para os tipos do cliente
      const revisoesParaCliente: SolicitacaoRevisaoParaCliente[] = (revisoes || []).map(r => ({
        id: r.id,
        descricaoCliente: r.descricao,
        dataSolicitacao: r.data_solicitacao,
        adminFeedback: r.admin_feedback,
        dataConclusaoRevisao: r.data_conclusao_revisao,
        statusRevisao: r.status_revisao,
        versoesAudio: (r.versoes_audio_revisao || []).map((v: any) => ({ // Corrigido de versoes_audio_revisao para versoesAudio
          id: v.id,
          audioUrl: v.audio_url, // Corrigido de audio_url para audioUrl
          enviadoEm: v.enviado_em, // Corrigido de enviado_em para enviadoEm
          comentariosAdmin: v.comentarios_admin,
          numeroVersao: v.numero_versao,
        })),
      }));

      setPedidoData({ pedido, revisoes: revisoesParaCliente });

    } catch (error: any) {
      console.error('Erro ao buscar dados iniciais para realtime:', error);
      setErrorRealtime(error.message || 'Falha ao carregar dados.');
      setPedidoData({ pedido: null, revisoes: null });
    } finally {
      setLoadingRealtime(false);
    }
  }, []);

  useEffect(() => {
    if (pedidoId) {
      fetchInitialData(pedidoId);
    } else {
      setPedidoData({ pedido: null, revisoes: null });
      setLoadingRealtime(false);
    }
  }, [pedidoId, fetchInitialData]);

  useEffect(() => {
    if (!pedidoId) return;

    // Inscrição para a tabela 'pedidos'
    const pedidoChannel = supabase
      .channel(`pedido-detalhes-${pedidoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` },
        (payload) => {
          console.log('Realtime: Mudança no pedido recebida:', payload);
          if (payload.new && (payload.new as Pedido).id === pedidoId) {
            // Atualizar o estado do pedido, mantendo as revisões existentes se não forem afetadas diretamente
             setPedidoData(prevData => ({
                ...prevData,
                // @ts-ignore
                pedido: { ...prevData.pedido, ...payload.new } as Pedido,
             }));
            // Invalidar queries relevantes para que outras partes da UI atualizem se necessário
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime: Inscrito em atualizações do pedido ${pedidoId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Realtime: Erro no canal do pedido ${pedidoId}:`, err || status);
          setErrorRealtime(`Erro de conexão realtime para o pedido: ${status}`);
        }
      });

    // Inscrição para a tabela 'solicitacoes_revisao'
    const revisoesChannel = supabase
      .channel(`revisoes-pedido-${pedidoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_revisao', filter: `pedido_id=eq.${pedidoId}` },
        async (payload) => {
          console.log('Realtime: Mudança nas revisões recebida:', payload);
          // Rebuscar todas as revisões para garantir consistência com sub-tabelas (versoes_audio_revisao)
          // e ordenação. Uma atualização otimista aqui pode ser complexa.
          if (pedidoId) { // Verificar se pedidoId ainda é válido
            const { data: novasRevisoes, error: revisoesError } = await supabase
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
              .order('data_solicitacao', { ascending: false });

            if (revisoesError) {
              console.error('Realtime: Erro ao rebuscar revisões:', revisoesError);
            } else {
              const revisoesParaCliente: SolicitacaoRevisaoParaCliente[] = (novasRevisoes || []).map(r => ({
                id: r.id,
                descricaoCliente: r.descricao,
                dataSolicitacao: r.data_solicitacao,
                adminFeedback: r.admin_feedback,
                dataConclusaoRevisao: r.data_conclusao_revisao,
                statusRevisao: r.status_revisao,
                versoesAudio: (r.versoes_audio_revisao || []).map((v: any) => ({
                  id: v.id,
                  audioUrl: v.audio_url,
                  enviadoEm: v.enviado_em,
                  comentariosAdmin: v.comentarios_admin,
                  numeroVersao: v.numero_versao,
                })),
              }));
              setPedidoData(prevData => ({ ...prevData, revisoes: revisoesParaCliente }));
              queryClient.invalidateQueries({ queryKey: ['revisoesCliente', pedidoId] });
              queryClient.invalidateQueries({ queryKey: ['revisoes', pedidoId] }); // Chave genérica para revisões
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime: Inscrito em atualizações das revisões para o pedido ${pedidoId}`);
        }
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Realtime: Erro no canal de revisões ${pedidoId}:`, err || status);
          setErrorRealtime(`Erro de conexão realtime para revisões: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(pedidoChannel);
      supabase.removeChannel(revisoesChannel);
      console.log(`Realtime: Canais para pedido ${pedidoId} removidos.`);
    };
  }, [pedidoId, queryClient]);

  return {
    pedidoEmTempoReal: pedidoData.pedido,
    revisoesEmTempoReal: pedidoData.revisoes,
    loadingRealtime,
    errorRealtime,
    refetchPedidoComRevisoes: () => {
      if(pedidoId) fetchInitialData(pedidoId);
    },
  };
}; 