import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// A função que chama o RPC para deletar ou desativar o pacote
const deletePacoteSafe = async (pacoteId: string) => {
  const { data, error } = await supabase.rpc('delete_pacote_safe', {
    p_pacote_id: pacoteId,
  });

  if (error) {
    console.error("Erro ao deletar pacote:", error);
    throw error;
  }
  return data; // Retorna a mensagem de status da função
};

// O hook de mutação
export const useDeletePacote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePacoteSafe,
    onSuccess: (statusMessage) => {
      toast.success("Operação concluída", {
        description: statusMessage,
      });
      // Invalida o cache de pacotes para atualizar a lista na UI
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
    },
    onError: (error) => {
      toast.error("Falha ao deletar o pacote", {
        description: error.message,
      });
    },
  });
}; 