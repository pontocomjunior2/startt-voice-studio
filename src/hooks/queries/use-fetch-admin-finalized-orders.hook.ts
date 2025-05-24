import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import type { AdminPedido } from '../../types/pedido.type';

const fetchAdminFinalizedOrders = async (): Promise<AdminPedido[]> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      id_pedido_serial,
      created_at,
      texto_roteiro,
      status,
      user_id,
      audio_final_url,
      titulo,
      estilo_locucao,
      orientacoes,
      tipo_audio,
      profiles ( 
        id,
        full_name,
        username
      ),
      locutores ( nome )
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
  console.log('[fetchAdminFinalizedOrders] Raw data from Supabase:', data);

  const mappedData = (data as any[])?.map((pedido: any): AdminPedido => {
    console.log('[fetchAdminFinalizedOrders] Processing pedido for mapping:', pedido);

    const userProfile: any | null = pedido.profiles && typeof pedido.profiles === 'object' && pedido.profiles.id 
      ? pedido.profiles 
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
    console.log('[fetchAdminFinalizedOrders] Mapped pedido:', result);
    return result;
  });
  
  return mappedData || []; 
};

export const useFetchAdminFinalizedOrders = () => {
  return useQuery<AdminPedido[], Error>({
    queryKey: ['adminFinalizedOrders'], 
    queryFn: fetchAdminFinalizedOrders,
  });
}; 