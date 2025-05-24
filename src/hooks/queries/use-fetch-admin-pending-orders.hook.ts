import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import type { AdminPedido, ProfileInPedido } from '../../types/pedido.type';

// As interfaces ProfileInPedido e AdminPedido foram movidas para pedido.type.ts

// Não vamos mais usar SupabasePedidoResponse para o cast de `data` se causa conflito.

const fetchAdminActiveOrders = async (): Promise<AdminPedido[]> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      id_pedido_serial,
      created_at,
      texto_roteiro,
      status,
      user_id,
      titulo,
      estilo_locucao,
      orientacoes,
      tipo_audio,
      profiles ( 
        id,
        full_name,
        username
      ),
      locutores ( nome ),
      audio_final_url
    `)
    .in('status', ['pendente', 'gravando'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Erro ao buscar pedidos ativos:", error);
    toast.error("Erro ao Carregar Pedidos Ativos", { 
      description: error.message || "Não foi possível carregar os pedidos ativos." 
    });
    throw new Error(error.message);
  }
  console.log('[fetchAdminActiveOrders] Raw data from Supabase:', data);

  const mappedData = (data as any[])?.map((pedido: any): AdminPedido => {
    console.log('[fetchAdminActiveOrders] Processing pedido for mapping:', pedido);

    const userProfile: ProfileInPedido | null = pedido.profiles && typeof pedido.profiles === 'object' && pedido.profiles.id 
      ? pedido.profiles as ProfileInPedido 
      : null;

    const locutorInfo: { nome: string } | null = pedido.locutores && typeof pedido.locutores === 'object' && pedido.locutores.nome
      ? { nome: pedido.locutores.nome }
      : null;

    const result = {
      id: pedido.id,
      id_pedido_serial: pedido.id_pedido_serial,
      created_at: pedido.created_at,
      texto_roteiro: pedido.texto_roteiro,
      status: pedido.status,
      user_id: pedido.user_id,
      profile: userProfile,
      locutores: locutorInfo,
      audio_final_url: pedido.audio_final_url ?? null,
      titulo: pedido.titulo,
      estilo_locucao: pedido.estilo_locucao,
      orientacoes: pedido.orientacoes,
      tipo_audio: pedido.tipo_audio ?? null,
    };
    console.log('[fetchAdminActiveOrders] Mapped pedido:', result);
    return result;
  });
  
  return mappedData || []; 
};

export const useFetchAdminActiveOrders = () => {
  return useQuery<AdminPedido[], Error>({
    queryKey: ['adminActiveOrders'],
    queryFn: fetchAdminActiveOrders,
  });
}; 