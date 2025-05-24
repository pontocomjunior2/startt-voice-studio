import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho se necessário
import { toast } from 'sonner';

interface UpdateUserRoleParams {
  userId: string;
  newRole: 'cliente' | 'admin';
  userNameOrFullName?: string | null; // Para a mensagem de toast
}

const updateUserRole = async ({ userId, newRole }: UpdateUserRoleParams) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error("Erro ao atualizar role:", error);
    toast.error("Erro ao Atualizar Role", { description: error.message || "Não foi possível atualizar a role." });
    throw new Error(error.message);
  }
  return { userId, newRole };
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateUserRoleParams, Error, UpdateUserRoleParams>({
    mutationFn: updateUserRole,
    onSuccess: (variables) => {
      toast.success("Role Atualizada", { 
        description: `Role de ${variables.userNameOrFullName || 'usuário'} atualizada para ${variables.newRole}.` 
      });

      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
    },
    onError: (error) => {
      console.error("Mutation error in useUpdateUserRole:", error.message);
    },
  });
}; 