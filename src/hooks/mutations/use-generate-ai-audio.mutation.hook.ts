import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient'; // Importa o cliente Supabase

// Os parâmetros que nosso endpoint de backend irá esperar
interface GenerateAiAudioParams {
  texto_roteiro: string;
  locutor_id: string;
  tituloPedido: string;
  userId: string;
}

const generateAiAudio = async (params: GenerateAiAudioParams) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Usuário não autenticado.');
  }
  
  // A URL deve corresponder ao endpoint criado no seu servidor Express
  const response = await fetch('/api/ia/gerar-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Incluindo o token de autenticação do Supabase
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!response.ok) {
    // Acessa a mensagem de erro que definimos no backend
    throw new Error(result.error || 'Ocorreu um erro no servidor ao gerar o áudio.');
  }

  return result;
};

export const useGenerateAiAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAiAudio,
    onSuccess: (data) => {
      toast.success("Áudio gerado com sucesso!", {
        description: "Seu pedido foi concluído e está disponível na sua lista de pedidos.",
        action: {
          label: 'Ver Pedido',
          onClick: () => {
            // Idealmente, redirecionar para a página de detalhes do pedido
            // window.location.href = `/cliente/pedidos/${data.pedidoId}`;
            console.log(`Redirecionar para o pedido: ${data.pedidoId}`);
          }
        }
      });
      // Invalida as queries de saldos e de pedidos para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-cliente'] }); 
    },
    onError: (error: Error) => {
      toast.error("Falha na geração do áudio", {
        description: error.message,
      });
    },
  });
}; 