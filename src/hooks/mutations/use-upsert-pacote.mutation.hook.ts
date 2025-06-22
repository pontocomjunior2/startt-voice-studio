import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import type { PacoteFormData } from '@/lib/validators/pacote.validator';

interface UpsertPacoteParams {
  pacoteId: string | null;
  pacoteData: PacoteFormData;
}

// Função que chama nosso RPC no Supabase
const upsertPacote = async ({ pacoteId, pacoteData }: UpsertPacoteParams) => {
  const { locutoresIds, ...restOfPacoteData } = pacoteData;

  const { data, error } = await supabase.rpc('upsert_pacote_with_locutores', {
    p_pacote_id: pacoteId,
    p_pacote_data: restOfPacoteData,
    p_locutor_ids: locutoresIds
  });

  if (error) {
    console.error("Erro ao salvar pacote:", error);
    throw error;
  }
  return data;
};

// Hook de mutação unificado
export const useUpsertPacote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertPacote,
    onSuccess: () => {
      toast.success("Pacote salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
      // Também invalidamos a lista de locutores de um pacote específico, se tivermos um cache para isso no futuro.
    },
    onError: (error: any) => {
      toast.error("Falha ao salvar o pacote", {
        description: error.code === 'PGRST116' 
          ? 'Erro de permissão ou a função não foi encontrada no banco de dados. Verifique o nome e a existência da função RPC.'
          : error.message,
      });
    },
  });
}; 