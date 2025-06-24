import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient'; // Verifique se o caminho está correto
import type { PacoteComLocutores } from '@/types';

// Definimos o tipo de dado que esperamos receber do banco de dados para um pacote
export interface Pacote {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  creditos_oferecidos: number;
  creditos_ia_oferecidos: number;
  ativo: boolean;
  listavel: boolean;
  created_at: string;
  updated_at: string | null;
}

// A função que efetivamente busca os dados no Supabase
const fetchPacotes = async (): Promise<PacoteComLocutores[]> => {
  const { data, error } = await supabase
    .from('pacotes')
    .select(`
      *,
      creditos_ia_oferecidos,
      locutores: locutores (
        id,
        nome
      )
    `)
    .order('nome', { ascending: true });

  if (error) {
    console.error("Erro ao buscar pacotes com locutores:", error);
    throw new Error(error.message);
  }

  // Ajuste para garantir que o campo se chame nome_artistico no frontend
  return (data || []).map(pacote => ({
    ...pacote,
    locutores: pacote.locutores.map((loc: any) => ({
      ...loc,
      nome_artistico: loc.nome 
    }))
  }));
};

// O hook customizado que usa o useQuery do TanStack Query
export const useFetchPacotes = () => {
  return useQuery<PacoteComLocutores[], Error>({
    queryKey: ['pacotes'], // Chave de cache para esta query
    queryFn: fetchPacotes, // Função que será executada para buscar os dados
  });
}; 