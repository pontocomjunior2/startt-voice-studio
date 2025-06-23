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

// Esta função envia dados do cartão diretamente para o backend processar no MP
const processCardPayment = async ({ pacoteId, userIdCliente, formData }: CardPaymentParams) => {
  const { token, transaction_amount, payment_method_id, installments, payer, card_data, issuer_id } = formData;
  const description = `Compra de créditos PontoComAudio`; // Descrição genérica

  console.log('🔍 [FRONTEND] Enviando dados para o backend...');

  const response = await fetch('/api/processar-pagamento-cartao-mp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token, // Token (se houver)
      card_data,
      valorTotal: transaction_amount,
      descricao: description,
      installments,
      paymentMethodId: payment_method_id,
      issuerId: issuer_id,
      payer,
      userIdCliente,
      pacoteId,
    }),
  });

  const result = await response.json();

  if (!response.ok || result.status !== 'approved') {
    console.log(`❌ [FRONTEND] Pagamento não aprovado. Status: ${result.status_detail || 'N/A'}`);
    throw new Error(result.message || 'Erro: Pagamento não foi aprovado.');
  }

  console.log('✅ [FRONTEND] Pagamento aprovado, aguardando webhook.');
  return result;
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