import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import type { AdminPedido } from './use-fetch-admin-pending-orders.hook'; // Reutilizar a interface AdminPedido

const fetchAdminFinalizedOrders = async (): Promise<AdminPedido[]> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      created_at,
      texto_roteiro,
      status,
      user_id,
      audio_final_url,
      profiles ( 
        id,
        full_name,
        username
      )
    `)
    .in('status', ['concluido', 'cancelado']) // Buscar pedidos concluídos ou cancelados
    .order('created_at', { ascending: false }); // Mais recentes primeiro para históricos

  if (error) {
    console.error("Erro ao buscar pedidos finalizados:", error);
    toast.error("Erro ao Carregar Pedidos Finalizados", { 
      description: error.message || "Não foi possível carregar os pedidos finalizados." 
    });
    throw new Error(error.message);
  }

  const mappedData = (data as any[])?.map((pedido: any): AdminPedido => {
    const userProfile: any | null = pedido.profiles && typeof pedido.profiles === 'object' && pedido.profiles.id 
      ? pedido.profiles 
      : null;

    return {
      id: pedido.id,
      created_at: pedido.created_at,
      texto_roteiro: pedido.texto_roteiro,
      status: pedido.status,
      user_id: pedido.user_id,
      profile: userProfile,
      audio_final_url: pedido.audio_final_url ?? null,
    };
  });
  
  return mappedData || []; 
};

export const useFetchAdminFinalizedOrders = () => {
  return useQuery<AdminPedido[], Error>({
    queryKey: ['adminFinalizedOrders'], 
    queryFn: fetchAdminFinalizedOrders,
  });
}; 