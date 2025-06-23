import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CardPaymentParams {
  pacoteId: string;
  userIdCliente: string;
  formData: any; // O objeto completo vindo do formulário com token oficial do MP
}

// Esta função orquestra o envio do token oficial para o backend
const processCardPayment = async ({ pacoteId, userIdCliente, formData }: CardPaymentParams) => {
  const { token, transaction_amount, payment_method_id, installments, payer } = formData;
  const description = `Compra de créditos PontoComAudio`; // Descrição genérica

  console.log('🔍 [FRONTEND] Enviando dados para o backend:', {
    token: token ? `${token.substring(0, 10)}...` : 'AUSENTE',
    transaction_amount,
    payment_method_id,
    installments,
    payer: payer ? 'PRESENTE' : 'AUSENTE',
    pacoteId,
    userIdCliente,
    ambiente: 'development'
  });

  const response = await fetch('/api/processar-pagamento-cartao-mp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token, // ✅ Token oficial do MP
      valorTotal: transaction_amount,
      descricao: description,
      installments,
      paymentMethodId: payment_method_id,
      payer,
      userIdCliente,
      pacoteId,
      // ❌ NÃO enviamos mais card_data!
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao processar pagamento.');
  }

  return result;
};

// O hook de mutação
export const useProcessCardPayment = () => {
  return useMutation({
    mutationFn: processCardPayment,
    onSuccess: () => {
      toast.success("Pagamento aprovado!", {
        description: "Seus créditos foram adicionados. Você será redirecionado.",
      });
    },
    onError: (error: any) => {
      toast.error("Falha no pagamento", {
        description: error.message,
      });
    },
  });
}; 