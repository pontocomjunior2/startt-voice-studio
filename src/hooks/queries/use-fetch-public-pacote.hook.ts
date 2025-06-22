import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Pacote } from './use-fetch-pacotes.hook'; // Reutilizamos a interface 'Pacote'

// A função que busca um único pacote por ID
const fetchPublicPacote = async (pacoteId: string): Promise<Pacote> => {
  const { data, error } = await supabase
    .from('pacotes')
    .select('*')
    .eq('id', pacoteId)
    .eq('ativo', true) // Garante que apenas pacotes ativos possam ser comprados
    .single(); // Esperamos um único resultado, ou um erro se não for encontrado

  if (error) {
    console.error("Erro ao buscar pacote público:", error);
    throw new Error("Pacote não encontrado ou indisponível.");
  }

  return data;
};

// O hook customizado
export const useFetchPublicPacote = (pacoteId: string) => {
  return useQuery<Pacote, Error>({
    queryKey: ['publicPacote', pacoteId], // A chave de cache inclui o ID do pacote
    queryFn: () => fetchPublicPacote(pacoteId),
    enabled: !!pacoteId, // A query só roda se o pacoteId existir
  });
}; 