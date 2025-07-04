import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Pedido } from '@/types/pedido.type';

// Este tipo pode ser movido para um arquivo types/pedido.type.ts se for usado em mais lugares
export interface PedidoCliente {
  id: string;
  id_pedido_serial: number;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'em_revisao' | 'aguardando_cliente' | 'rejeitado' | 'estornado' | 'falhou' | 'gerando_ia' | 'em_producao' | 'em_analise';
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome_artistico: string } | null;
  titulo?: string;
  admin_message: string | null;
  solicitacoes_revisao_count: number;
  solicitacoes_revisao: Array<{
    status_revisao: string;
    versoes_audio_revisao: Array<{ audio_url: string; enviado_em: string }>;
    data_conclusao_revisao: string | null;
  }>;
}

const fetchClientOrders = async (userId: string): Promise<Pedido[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      id_pedido_serial,
      created_at,
      texto_roteiro,
      titulo,
      creditos_debitados,
      status,
      audio_final_url,
      downloaded_at,
      cliente_notificado_em,
      tipo_audio,
      estilo_locucao,
      orientacoes,
      admin_cancel_reason,
      admin_message,
      cliente_resposta_info,
      data_resposta_cliente,
      cliente_audio_resposta_url,
      locutores ( nome_artistico ),
      solicitacoes_revisao ( id, status_revisao, data_conclusao_revisao, versoes_audio_revisao ( audio_url, enviado_em ) )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    throw new Error(error.message);
  }

  const mappedData = (data || []).map((pedido: any) => ({
    ...pedido,
    locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
    solicitacoes_revisao_count: pedido.solicitacoes_revisao.length,
  }));

  return mappedData as Pedido[];
};

export const useFetchClientOrders = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<Pedido[], Error>({
    queryKey: ['clientOrders', userId],
    queryFn: () => fetchClientOrders(userId!),
    enabled: !!userId,
  });
}; 