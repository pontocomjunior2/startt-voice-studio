import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import type { PacoteFormValues } from '@/lib/validators/pacote.validator';

// A função agora recebe diretamente os valores do formulário
const upsertPacote = async (pacoteData: PacoteFormValues) => {
  const { id, locutores, ...restOfPacoteData } = pacoteData;

  const params = {
    p_pacote_id: id || null,
    p_pacote_data: {
      ...restOfPacoteData,
      // Garante que o valor seja numérico antes de enviar
      valor: Number(restOfPacoteData.valor),
      creditos_oferecidos: Number(restOfPacoteData.creditos_oferecidos),
      // Converte para null se não for fornecido
      validade_dias: restOfPacoteData.validade_dias ? Number(restOfPacoteData.validade_dias) : null,
    },
    p_locutor_ids: locutores || []
  };

  const { data, error } = await supabase.rpc('upsert_pacote_with_locutores', params);

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
    },
    onError: (error: any) => {
      toast.error("Falha ao salvar o pacote", {
        description: error.message,
      });
    },
  });
}; 