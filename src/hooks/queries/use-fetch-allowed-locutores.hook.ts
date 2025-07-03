import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext'; // Precisamos saber quem é o cliente

// Novo tipo que representa todos os dados de um locutor para o catálogo
export interface LocutorCatalogo {
  id: string;
  nome_artistico: string;
  avatar_url: string | null;
  bio: string | null;
  ia_disponivel: boolean;
  ia_voice_id: string | null;
  demos: Array<{
    url: string;
    estilo?: string;
  }>;
}

// A função que chama a nossa RPC de lógica de negócio
const fetchAllowedLocutores = async (userId: string): Promise<LocutorCatalogo[]> => {
  if (!userId) {
    return []; // Retorna vazio se não houver ID de usuário
  }
  
  const { data, error } = await supabase.rpc('get_locutores_disponiveis_para_cliente', {
    p_user_id: userId // Passamos o ID do usuário para a função
  });

  if (error) {
    console.error("Erro ao buscar locutores permitidos:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// O hook customizado
export const useFetchAllowedLocutores = () => {
  const { user } = useAuth(); // Pega o usuário logado do contexto
  const userId = user?.id;

  return useQuery<LocutorCatalogo[], Error>({
    // A chave de cache depende do ID do usuário, para que cada usuário tenha sua própria lista em cache
    queryKey: ['allowedLocutores', userId], 
    // A função queryFn só será executada se userId for uma string válida (graças ao 'enabled' abaixo)
    // Portanto, podemos passar userId diretamente, sabendo que não será nulo ou indefinido.
    queryFn: () => fetchAllowedLocutores(userId!),
    // A query só será executada se o usuário estiver logado e o userId for uma string
    enabled: !!userId,
  });
}; 