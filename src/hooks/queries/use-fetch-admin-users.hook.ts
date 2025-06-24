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
  // Campos que serão adicionados pelo useEffect na página
  saldoCalculadoCreditos?: number;
  pacotes_ativos?: string[];
}

const fetchAdminUsers = async (): Promise<UserProfile[]> => {
  // Retorna à busca simples, pois os detalhes serão buscados separadamente
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, updated_at') 
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    toast.error("Erro ao Carregar Usuários", { description: error.message });
    throw new Error(error.message);
  }
  
  return data as UserProfile[] || [];
};

export const useFetchAdminUsers = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ['adminUsers'], // Volta para a key original
    queryFn: fetchAdminUsers,
  });
}; 