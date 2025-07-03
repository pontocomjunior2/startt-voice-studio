import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// Este tipo pode ser movido para um arquivo types/pedido.type.ts se for usado em mais lugares
export interface PedidoCliente {
  id: string;
  id_pedido_serial: number;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'em_revisao' | 'aguardando_cliente' | 'rejeitado';
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome_artistico: string } | null;
  titulo?: string;
}

const fetchClientOrders = async (userId: string): Promise<PedidoCliente[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      id_pedido_serial,
      created_at,
      texto_roteiro,
      creditos_debitados,
      status,
      audio_final_url,
      downloaded_at,
      cliente_notificado_em,
      locutores ( nome_artistico ),
      titulo
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    throw new Error(error.message);
  }

  // O Supabase v1 às vezes retorna relacionamentos como um array de um item.
  // Esta linha garante que 'locutores' seja sempre um objeto ou nulo.
  const mappedData = (data || []).map((pedido: any) => ({
    ...pedido,
    locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
  }));

  return mappedData;
};

export const useFetchClientOrders = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<PedidoCliente[], Error>({
    queryKey: ['clientOrders', userId],
    queryFn: () => fetchClientOrders(userId!),
    enabled: !!userId,
  });
}; 