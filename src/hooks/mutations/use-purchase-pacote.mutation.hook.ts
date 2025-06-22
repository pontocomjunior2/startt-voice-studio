import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const purchasePacote = async (pacoteId: string) => {
  const { error } = await supabase.rpc('comprar_pacote_creditos', {
    p_pacote_id: pacoteId,
  });

  if (error) {
    console.error("Erro ao comprar pacote:", error);
    throw error;
  }
};

export const usePurchasePacote = () => {
  return useMutation({
    mutationFn: purchasePacote,
    onSuccess: () => {
      toast.success("Compra realizada com sucesso!", {
        description: "Seus créditos foram adicionados à sua conta.",
      });
      // Poderíamos adicionar uma invalidação de query do saldo do usuário aqui no futuro
    },
    onError: (error) => {
      toast.error("Falha na compra", {
        description: error.message === 'Usuário não autenticado.' 
          ? "Você precisa fazer login para comprar um pacote."
          : error.message,
      });
    },
  });
}; 