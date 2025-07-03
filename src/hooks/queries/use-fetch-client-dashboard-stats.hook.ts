import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientDashboardStats {
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosConcluidos: number;
}

const fetchClientDashboardStats = async (userId: string): Promise<ClientDashboardStats> => {
  if (!userId) {
    return { totalPedidos: 0, pedidosPendentes: 0, pedidosConcluidos: 0 };
  }

  const fetchCount = async (statusIn?: string[]) => {
    let query = supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (statusIn) {
      query = query.in('status', statusIn);
    } else {
      // Se statusIn não for fornecido, mas for para pedidos concluidos, por exemplo.
      // Neste caso, a lógica abaixo já diferencia.
    }
    
    const { count, error } = await query;
    if (error) {
      console.error(`Erro ao buscar contagem de pedidos:`, error);
      throw new Error(error.message);
    }
    return count ?? 0;
  };

  const [totalPedidos, pedidosPendentes, pedidosConcluidos] = await Promise.all([
    fetchCount(),
    fetchCount(['pendente', 'gravando', 'em_producao', 'em_analise']),
    fetchCount(['concluido']),
  ]);

  return { totalPedidos, pedidosPendentes, pedidosConcluidos };
};

export const useFetchClientDashboardStats = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<ClientDashboardStats, Error>({
    queryKey: ['clientDashboardStats', userId],
    queryFn: () => fetchClientDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}; 