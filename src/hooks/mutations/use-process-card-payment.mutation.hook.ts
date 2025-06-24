import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface ProcessCardPaymentVariables {
  pacoteId: string;
  userIdCliente: string;
  formData: any; // O objeto do formulário
}

// Esta função envia dados do cartão diretamente para o backend processar no MP
const processCardPayment = async (variables: ProcessCardPaymentVariables) => {
  console.log("🔍 [FRONTEND] Enviando dados para o backend...", variables);
  const { pacoteId, userIdCliente, formData } = variables;

  // CORREÇÃO: Combinar todos os dados em um único objeto plano
  const payload = {
    pacoteId,
    userIdCliente,
    ...formData
  };

  const response = await fetch('/api/processar-pagamento-cartao-mp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload), // Enviar o payload combinado
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ [FRONTEND] Resposta de erro do backend:", data);
    const errorMessage = data.message || `Erro ${response.status} ao processar o pagamento.`;
    throw new Error(errorMessage);
  }

  console.log('✅ [FRONTEND] Pagamento aprovado, aguardando webhook.');
  return data;
};

// O hook de mutação
export const useProcessCardPayment = () => {
  return useMutation({
    mutationFn: processCardPayment,
    onSuccess: (data) => {
      toast.success("Pagamento recebido com sucesso!", {
        description: data.message || "Aguarde a confirmação para receber seus créditos.",
      });
    },
    onError: (error: any) => {
      toast.error("Falha no pagamento", {
        description: error.message || "Verifique os dados do cartão e tente novamente.",
      });
    },
  });
}; 