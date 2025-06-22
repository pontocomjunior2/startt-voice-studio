import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Pacote } from './use-fetch-pacotes.hook'; // Reutilizamos a interface 'Pacote'

// A função que busca os pacotes públicos
const fetchListablePacotes = async (): Promise<Pacote[]> => {
  const { data, error } = await supabase
    .from('pacotes')
    .select('*')
    .eq('ativo', true)      // Filtro 1: O pacote deve estar ativo
    .eq('listavel', true)   // Filtro 2: O pacote deve ser listável publicamente
    .order('valor', { ascending: true }); // Ordena do mais barato para o mais caro

  if (error) {
    console.error("Erro ao buscar pacotes listáveis:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// O hook customizado
export const useFetchListablePacotes = () => {
  return useQuery<Pacote[], Error>({
    queryKey: ['listablePacotes'], // Chave de cache para esta query específica
    queryFn: fetchListablePacotes,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });
}; 