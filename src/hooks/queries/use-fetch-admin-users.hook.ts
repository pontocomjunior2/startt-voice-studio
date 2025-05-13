import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário
import { toast } from 'sonner';

// Podemos mover esta interface para um arquivo .type.ts dedicado se for usada em mais lugares.
// Por exemplo: src/types/user-profile.type.ts
export interface UserProfile {
  id: string;
  updated_at?: string;
  full_name?: string | null;
  username?: string | null; // Pode ser email também
  credits?: number | null;
  role?: string | null;
  // created_at?: string; // Removido se a coluna não existe no DB
}

const fetchAdminUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    // Removido 'created_at' do select, pois a coluna não existe no banco de dados.
    // Se 'updated_at' for usado para exibir a data de criação/última atualização, ele já está incluído.
    .select('id, full_name, username, credits, role, updated_at') 
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    const description = error.message || "Não foi possível carregar os usuários.";
    toast.error("Erro ao Carregar Usuários", {
      description: `${description}${error.details ? ` (Detalhes: ${error.details})` : ''}${error.hint ? ` (Sugestão: ${error.hint})` : ''}`
    });
    throw new Error(error.message); // React Query lida com erros lançados
  }
  // O mapeamento para created_at: user.updated_at parecia estranho,
  // Se 'created_at' real existir na tabela, deve ser selecionado.
  // Se não, e 'updated_at' for usado como proxy para 'data de criação' na UI,
  // essa transformação pode ser feita no componente ao exibir, ou aqui se necessário.
  // Por ora, vou assumir que 'created_at' é uma coluna real ou que 'updated_at' é suficiente.
  return data as UserProfile[] || [];
};

export const useFetchAdminUsers = () => {
  return useQuery<UserProfile[], Error>({
    queryKey: ['adminUsers'], // Query key para identificar esta query
    queryFn: fetchAdminUsers,
    // Opções adicionais do React Query podem ser configuradas aqui,
    // como staleTime, cacheTime, refetchOnWindowFocus, etc.
    // Exemplo: staleTime: 1000 * 60 * 5, // 5 minutos
  });
}; 