import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Os parâmetros que nosso endpoint de backend irá esperar
interface GenerateAiAudioParams {
  scriptText: string;
  locutorId: string;
  tituloPedido: string;
  userId: string;
  // Adicione quaisquer outros campos do formulário que o backend precise
}

const generateAiAudio = async (params: GenerateAiAudioParams) => {
  // A URL deve corresponder ao endpoint criado no seu servidor Express
  const response = await fetch('/api/ia/gerar-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Incluir token de autenticação se necessário
    },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Ocorreu um erro no servidor ao gerar o áudio.');
  }

  return result;
};

export const useGenerateAiAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAiAudio,
    onSuccess: () => {
      toast.success("Áudio gerado com sucesso!", {
        description: "Seu pedido foi concluído e está disponível em 'Meus Áudios'.",
      });
      // Invalida as queries de saldos e de pedidos para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['saldos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] }); // Assumindo que a lista de pedidos do cliente tem essa chave
    },
    onError: (error) => {
      toast.error("Falha na geração do áudio", {
        description: error.message,
      });
    },
  });
}; 