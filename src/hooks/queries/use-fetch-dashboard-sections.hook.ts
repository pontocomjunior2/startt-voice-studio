import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface UltimoPedidoItem {
  id: string;
  titulo?: string | null;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'em_revisao' | 'aguardando_cliente' | 'rejeitado';
  created_at: string;
  locutores: { nome_artistico: string } | null;
}

export interface LocutorFavoritoExibicao {
  id: string;
  nome_artistico: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface DashboardSectionsData {
  ultimosPedidos: UltimoPedidoItem[];
  locutoresFavoritos: LocutorFavoritoExibicao[];
}

const fetchDashboardSections = async (userId: string): Promise<DashboardSectionsData> => {
  if (!userId) {
    return { ultimosPedidos: [], locutoresFavoritos: [] };
  }

  // Busca dos últimos 3 pedidos
  const fetchUltimosPedidos = supabase
    .from('pedidos')
    .select('id, titulo, status, created_at, locutores ( nome_artistico )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  // Busca dos IDs dos locutores favoritos
  const fetchLocutoresFavoritos = async () => {
    const { data: favoritosIdsData, error: favoritosIdsError } = await supabase
      .from('locutores_favoritos')
      .select('locutor_id')
      .eq('user_id', userId);

    if (favoritosIdsError) throw favoritosIdsError;

    if (favoritosIdsData && favoritosIdsData.length > 0) {
      const ids = favoritosIdsData.map(f => f.locutor_id);
      const { data: locutoresData, error: locutoresError } = await supabase
        .from('locutores')
        .select('id, nome_artistico, avatar_url, bio')
        .in('id', ids)
        .limit(3);
      if (locutoresError) throw locutoresError;
      return locutoresData || [];
    }
    return [];
  };

  const [pedidosResult, locutoresResult] = await Promise.all([
    fetchUltimosPedidos,
    fetchLocutoresFavoritos(),
  ]);

  if (pedidosResult.error) throw new Error(pedidosResult.error.message);
  // O erro de locutores já é lançado dentro da função fetchLocutoresFavoritos

  const mappedUltimosPedidos = (pedidosResult.data || []).map((pedido: any) => ({
    ...pedido,
    locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
  }));

  return {
    ultimosPedidos: mappedUltimosPedidos,
    locutoresFavoritos: locutoresResult,
  };
};

export const useFetchDashboardSections = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<DashboardSectionsData, Error>({
    queryKey: ['dashboardSections', userId],
    queryFn: () => fetchDashboardSections(userId!),
    enabled: !!userId,
  });
}; 