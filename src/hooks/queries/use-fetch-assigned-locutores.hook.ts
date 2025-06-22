import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// A função que busca os IDs dos locutores associados a um cliente
const fetchAssignedLocutores = async (clienteId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('clientes_locutores')
    .select('locutor_id')
    .eq('cliente_id', clienteId);

  if (error) {
    console.error("Erro ao buscar locutores atribuídos:", error);
    throw new Error(error.message);
  }

  // Retorna um array de strings (UUIDs)
  return data.map(item => item.locutor_id);
};

// O hook customizado
export const useFetchAssignedLocutores = (clienteId: string | null) => {
  return useQuery<string[], Error>({
    queryKey: ['assignedLocutores', clienteId], // A chave de cache inclui o ID do cliente
    queryFn: () => fetchAssignedLocutores(clienteId!),
    // O 'enabled' é crucial: a query só será executada se um clienteId for fornecido
    enabled: !!clienteId,
    staleTime: 1000 * 60, // Cache de 1 minuto
  });
}; 