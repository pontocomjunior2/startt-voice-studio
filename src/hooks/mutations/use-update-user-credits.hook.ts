import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário
import { toast } from 'sonner';

interface UpdateUserCreditsParams {
  userId: string;
  newCredits: number;
  userNameOrFullName?: string | null; // Para a mensagem de toast
}

const updateUserCredits = async ({ userId, newCredits }: UpdateUserCreditsParams) => {
  const { error } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (error) {
    console.error("Erro ao atualizar créditos:", error);
    toast.error("Erro ao Atualizar Créditos", { description: error.message || "Não foi possível atualizar os créditos." });
    throw new Error(error.message);
  }
  return { userId, newCredits }; // Retorna os dados para uso no onSuccess, se necessário
};

export const useUpdateUserCredits = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateUserCreditsParams, Error, UpdateUserCreditsParams>({ 
    mutationFn: updateUserCredits,
    onSuccess: (variables) => {
      toast.success("Créditos Atualizados", { 
        description: `Créditos de ${variables.userNameOrFullName || 'usuário'} atualizados para ${variables.newCredits}.` 
      });

      // Invalida queries para forçar a recarga dos dados atualizados
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); 
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      
      // Você também pode querer atualizar diretamente o cache com setQueryData se preferir uma atualização otimista
      // ou para evitar um "flash" de carregamento, mas a invalidação é mais simples para começar.
    },
    onError: (error) => {
      // O toast de erro já é tratado dentro de updateUserCredits,
      // mas você pode adicionar lógica adicional aqui se necessário.
      console.error("Mutation error in useUpdateUserCredits:", error.message);
    },
  });
}; 