import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// A função que altera o status 'ativo' de um pacote
const togglePacoteAtivo = async ({ id, newStatus }: { id: string, newStatus: boolean }) => {
  const { error } = await supabase
    .from('pacotes')
    .update({ ativo: newStatus })
    .eq('id', id);

  if (error) {
    console.error("Erro ao alterar status do pacote:", error);
    throw new Error(error.message);
  }
};

// O hook de mutação para a ação
export const useTogglePacoteAtivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: togglePacoteAtivo,
    onSuccess: (_, variables) => {
      const statusText = variables.newStatus ? "ativado" : "desativado";
      toast.success(`Pacote ${statusText} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['pacotes'] });
    },
    onError: (error) => {
      toast.error("Falha ao alterar o status do pacote", {
        description: error.message,
      });
    },
  });
}; 