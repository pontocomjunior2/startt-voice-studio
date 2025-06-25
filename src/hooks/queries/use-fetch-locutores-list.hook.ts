import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface LocutorSelecao {
  id: string;
  nome_artistico: string;
}

const fetchLocutoresList = async (): Promise<LocutorSelecao[]> => {
  const { data, error } = await supabase
    .from('locutores')
    .select('id, nome_artistico')
    .eq('ativo', true)
    .order('nome_artistico', { ascending: true });

  if (error) {
    console.error("Erro ao buscar lista de locutores:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useFetchLocutoresList = () => {
  return useQuery<LocutorSelecao[], Error>({
    queryKey: ['locutoresList'],
    queryFn: fetchLocutoresList,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos, pois a lista não muda com frequência
  });
}; 