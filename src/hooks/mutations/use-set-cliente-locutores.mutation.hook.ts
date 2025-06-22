import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface SetClienteLocutoresParams {
  clienteId: string;
  locutoresIds: string[];
}

// A função que chama o nosso RPC
const setClienteLocutores = async ({ clienteId, locutoresIds }: SetClienteLocutoresParams) => {
  const { error } = await supabase.rpc('set_cliente_locutores', {
    p_cliente_id: clienteId,
    p_locutor_ids: locutoresIds,
  });

  if (error) {
    console.error("Erro ao definir locutores para o cliente:", error);
    throw error;
  }
};

// O hook de mutação
export const useSetClienteLocutores = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setClienteLocutores,
    onSuccess: (data, variables) => {
      toast.success("Permissões de locutores atualizadas com sucesso!");
      // Invalida o cache para garantir que, se o modal for reaberto, ele buscará os dados mais recentes.
      queryClient.invalidateQueries({ queryKey: ['assignedLocutores', variables.clienteId] });
    },
    onError: (error) => {
      toast.error("Falha ao atualizar permissões", {
        description: error.message,
      });
    },
  });
}; 