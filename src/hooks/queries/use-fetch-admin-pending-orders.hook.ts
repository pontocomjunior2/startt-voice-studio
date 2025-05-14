import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

// Interface para o perfil do usuário
interface ProfileInPedido {
  id: string;
  full_name?: string | null;
  username?: string | null;
}

// Interface para o objeto final que usamos na UI
export interface AdminPedido {
  id: string;
  id_pedido_serial: string;
  created_at: string;
  texto_roteiro: string | null;
  status: string;
  user_id: string;
  profile: ProfileInPedido | null;
  audio_final_url?: string | null;
}

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
      profiles ( 
        id,
        full_name,
        username
      ),
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

  // Se `data` vem com `profiles` como objeto, mas TS infere array, usamos `any`
  // para contornar o conflito de tipo e confiamos na estrutura observada no log.
  const mappedData = (data as any[])?.map((pedido: any): AdminPedido => {
    // O log mostrou que pedido.profiles é um objeto direto.
    const userProfile: ProfileInPedido | null = pedido.profiles && typeof pedido.profiles === 'object' && pedido.profiles.id 
      ? pedido.profiles as ProfileInPedido 
      : null;

    return {
      id: pedido.id,
      id_pedido_serial: pedido.id_pedido_serial,
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

export const useFetchAdminActiveOrders = () => {
  return useQuery<AdminPedido[], Error>({
    queryKey: ['adminActiveOrders'],
    queryFn: fetchAdminActiveOrders,
  });
}; 