import { useState, useCallback, memo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProcessCardPayment } from '@/hooks/mutations/use-process-card-payment.mutation.hook';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Declaração global para acessar o SDK do Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CreditCardFormProps {
  pacote: {
    id: string;
    valor: number;
    nome: string;
  };
  onPaymentSuccess: () => void;
}

interface CardData {
  cardNumber: string;
  expiryDate: string;
  securityCode: string;
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
  installments: string;
}

// Inicializa o SDK do Mercado Pago
const initializeMercadoPago = () => {
  if (window.MercadoPago) {
    new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
  }
};

const CreditCardForm = memo(({ pacote, onPaymentSuccess }: CreditCardFormProps) => {
  const { user } = useAuth();
  const { mutate: processPayment, isPending } = useProcessCardPayment();

  // Estado do formulário
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    expiryDate: '',
    securityCode: '',
    cardholderName: '',
    identificationType: 'CPF',
    identificationNumber: '11111111111',
    installments: '1'
  });
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [issuerId, setIssuerId] = useState<string>('');

  // Carrega o script do MP e inicializa
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      console.log('✅ [MP SDK] Script carregado');
      initializeMercadoPago();
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Detecta a bandeira do cartão (payment_method_id)
  const getPaymentMethod = useCallback(async (bin: string) => {
    if (bin.length >= 6 && window.MercadoPago) {
      try {
        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
        const { results } = await mp.getPaymentMethods({ bin });
        if (results && results.length > 0) {
          const paymentMethod = results[0];
          console.log('✅ [MP SDK] Bandeira detectada:', paymentMethod.id);
          setPaymentMethodId(paymentMethod.id);

          // Captura o ID do emissor, se existir
          if (paymentMethod.issuer && paymentMethod.issuer.id) {
            console.log('✅ [MP SDK] Emissor detectado:', paymentMethod.issuer.id);
            setIssuerId(paymentMethod.issuer.id);
          } else {
            setIssuerId(''); // Limpa caso o cartão não tenha emissor (ex: cartões de débito)
          }

        }
      } catch (error) {
        console.error('❌ [MP SDK] Erro ao obter método de pagamento:', error);
        toast.error('Não foi possível identificar a bandeira do cartão.');
      }
    }
  }, []);

  // Funções de formatação
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  const formatSecurityCode = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

  const updateCardDataFormatted = useCallback((field: string, value: string) => {
    let formattedValue = value;
    
    switch (field) {
      case 'cardNumber':
        formattedValue = formatCardNumber(value);
        const bin = value.replace(/\D/g, '').substring(0, 6);
        getPaymentMethod(bin);
        break;
      case 'expiryDate':
        formattedValue = formatExpiryDate(value);
        break;
      case 'securityCode':
        formattedValue = formatSecurityCode(value);
        break;
      case 'cardholderName':
        formattedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
        break;
      case 'identificationNumber':
        formattedValue = value.replace(/\D/g, '');
        break;
    }
    
    setCardData((prev: CardData) => ({ ...prev, [field]: formattedValue }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pacote || !window.MercadoPago) {
      toast.error("Erro", { description: "A página não foi carregada corretamente. Tente recarregar." });
      return;
    }

    const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

    try {
      // 1. ESTRUTURA CORRIGIDA para createCardToken
      const token = await mp.createCardToken({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.expiryDate.split('/')[0],
        cardExpirationYear: `20${cardData.expiryDate.split('/')[1]}`, // Ano com 4 dígitos
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber,
      });

      if (!token?.id) {
        throw new Error("Não foi possível gerar o token de pagamento. Verifique os dados do cartão.");
      }

      console.log('✅ [FRONTEND] Token gerado com sucesso:', token.id);

      // 2. ENVIAR APENAS O TOKEN PARA O BACKEND
      const formData = {
        token: token.id,
        transaction_amount: pacote.valor,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        installments: parseInt(cardData.installments),
        payer: {
          email: user.email,
          identification: {
            type: cardData.identificationType,
            number: cardData.identificationNumber
          }
        },
      };

      processPayment({
        pacoteId: pacote.id,
        userIdCliente: user.id,
        formData
      }, {
        onSuccess: onPaymentSuccess
      });

    } catch (error: any) {
      console.error('❌ [ERRO COMPLETO DO MP]:', error);

      // Tratamento de erro já corrigido
      const errorMessage = error[0]?.message || 'Verifique os dados do cartão e tente novamente.';
      toast.error('Erro ao Processar Cartão', {
        description: errorMessage
      });
    }
  };

  const isProcessing = isPending;

  if (!pacote) return null;

  return (
    <div className="w-full">
      <div className="border rounded-lg p-4 bg-muted/20">
        <h3 className="text-lg font-semibold mb-4">Dados do Cartão</h3>
        


        <form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          onSubmitCapture={() => {
            console.log('🔍 [FORM] onSubmitCapture disparado');
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Número do Cartão *</label>
            <input
              type="text"
              value={cardData.cardNumber}
              onChange={(e) => updateCardDataFormatted('cardNumber', e.target.value)}
              placeholder="1234 5678 9012 3456"
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={19}
              required
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Validade *</label>
              <input
                type="text"
                value={cardData.expiryDate}
                onChange={(e) => updateCardDataFormatted('expiryDate', e.target.value)}
                placeholder="MM/AA"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={5}
                required
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CVV *</label>
              <input
                type="text"
                value={cardData.securityCode}
                onChange={(e) => updateCardDataFormatted('securityCode', e.target.value)}
                placeholder="123"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={4}
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nome no Cartão *</label>
            <input
              type="text"
              value={cardData.cardholderName}
              onChange={(e) => updateCardDataFormatted('cardholderName', e.target.value)}
              placeholder="Nome como no cartão"
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Documento</label>
              <select 
                value={cardData.identificationType}
                onChange={(e) => setCardData(prev => ({ ...prev, identificationType: e.target.value }))}
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isProcessing}
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número do Documento</label>
              <input
                type="text"
                value={cardData.identificationNumber}
                onChange={(e) => updateCardDataFormatted('identificationNumber', e.target.value)}
                placeholder="12345678901"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Parcelas</label>
            <select
              value={cardData.installments}
              onChange={(e) => setCardData(prev => ({ ...prev, installments: e.target.value }))}
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isProcessing}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num}x de {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(pacote.valor / num)}
                  {num === 1 ? ' (à vista)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold cursor-pointer" 
              disabled={isProcessing}
              onClick={() => {
                console.log('🔍 [BUTTON] Botão clicado!', { isProcessing, isPending });
                // O submit será tratado pelo form onSubmit
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando Pagamento...
                </>
              ) : (
                `Pagar ${new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(pacote.valor)}`
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            <p>🔒 Processamento seguro via Mercado Pago</p>
          </div>
        </form>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.pacote?.id === nextProps.pacote?.id && 
    prevProps.pacote?.valor === nextProps.pacote?.valor &&
    prevProps.onPaymentSuccess === nextProps.onPaymentSuccess
  );
});

CreditCardForm.displayName = 'CreditCardForm';

export default CreditCardForm;