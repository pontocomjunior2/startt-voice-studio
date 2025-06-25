import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Pedido } from '@/types/pedido.type';
import { toast } from 'sonner';

const fetchPedidosCliente = async (userId: string): Promise<Pedido[]> => {
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
      locutores:locutor_id ( nome_artistico ),
      solicitacoes_revisao (
        id,
        status_revisao,
        data_conclusao_revisao,
        versoes_audio_revisao ( audio_url, enviado_em )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    toast.error("Erro ao carregar seu histórico de áudios.", { description: error.message });
    throw new Error(error.message);
  }

  const mappedData = (data || []).map((pedido: any) => ({
    ...pedido,
    locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
  }));

  return mappedData as Pedido[];
};

export const useFetchPedidosCliente = () => {
  const { user } = useAuth();

  return useQuery<Pedido[], Error>({
    queryKey: ['pedidosCliente', user?.id],
    queryFn: () => fetchPedidosCliente(user!.id),
    enabled: !!user?.id,
  });
}; 