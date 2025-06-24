import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário
import { toast } from 'sonner';

// Podemos mover esta interface para um arquivo .type.ts dedicado se for usada em mais lugares.
// Por exemplo: src/types/user-profile.type.ts
export interface UserProfile {
  id: string;
  updated_at?: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  saldo_gravacao: number;
  saldo_ia: number;
  pacotes_ativos?: string[];
}

const fetchAdminUsers = async (): Promise<UserProfile[]> => {
  // A query agora faz o JOIN diretamente com a VIEW e busca os pacotes,
  // eliminando a necessidade de uma RPC separada.
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      updated_at,
      full_name,
      username,
      role,
      user_credit_balances_view (
        saldo_gravacao,
        saldo_ia
      ),
      lotes_creditos!user_id (
        pacotes ( nome )
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar usuários com detalhes:", error);
    toast.error("Erro ao Carregar Usuários", { description: error.message });
    throw new Error(error.message);
  }
  
  // Mapeia os dados para o formato final que o frontend espera.
  const usersWithDetails = (data || []).map(user => {
    const balanceView = Array.isArray(user.user_credit_balances_view) 
      ? user.user_credit_balances_view[0] 
      : user.user_credit_balances_view;

    // Filtra e mapeia para obter nomes de pacotes únicos.
    const pacotesAtivos = Array.from(
      new Set(
        user.lotes_creditos
          .filter((lote: any) => lote.pacotes)
          .map((lote: any) => lote.pacotes.nome)
      )
    );

    return {
      id: user.id,
      updated_at: user.updated_at,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      saldo_gravacao: balanceView?.saldo_gravacao || 0,
      saldo_ia: balanceView?.saldo_ia || 0,
      pacotes_ativos: pacotesAtivos,
    };
  });

  return usersWithDetails as UserProfile[];
};

export const useFetchAdminUsers = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ['adminUsers'],
    queryFn: fetchAdminUsers,
  });
}; 