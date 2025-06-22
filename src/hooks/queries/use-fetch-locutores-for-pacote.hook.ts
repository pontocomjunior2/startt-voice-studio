import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// Tipo simplificado para o locutor nesta view
export interface LocutorDoPacote {
  id: string;
  nome: string;
  avatar_url: string | null;
}

// A função que busca os locutores de um pacote
const fetchLocutoresForPacote = async (pacoteId: string): Promise<LocutorDoPacote[]> => {
  const { data, error } = await supabase
    .from('pacotes')
    .select(`
      locutores (
        id,
        nome,
        avatar_url
      )
    `)
    .eq('id', pacoteId)
    .single();

  if (error) {
    console.error("Erro ao buscar locutores do pacote:", error);
    throw new Error("Não foi possível carregar os locutores do pacote.");
  }
  
  // O resultado vem aninhado, então precisamos extraí-lo
  return (data?.locutores as LocutorDoPacote[]) || [];
};

// O hook customizado
export const useFetchLocutoresForPacote = (pacoteId: string) => {
  return useQuery<LocutorDoPacote[], Error>({
    queryKey: ['locutoresForPacote', pacoteId],
    queryFn: () => fetchLocutoresForPacote(pacoteId),
    enabled: !!pacoteId,
  });
}; 