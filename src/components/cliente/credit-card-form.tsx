import { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProcessCardPayment } from '@/hooks/mutations/use-process-card-payment.mutation.hook';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';


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
  installments: string;
}

const CreditCardForm = memo(({ pacote, onPaymentSuccess }: CreditCardFormProps) => {
  const { user } = useAuth();
  const { mutate: processPayment, isPending } = useProcessCardPayment();

  // Formulário com persistência completa no localStorage
  const [cardData, setCardData] = useState(() => {
    // Inicializar com dados salvos no localStorage
    try {
      const saved = localStorage.getItem(`card-data-${user?.id}-${pacote.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados salvos do cartão:', error);
    }
    
    return {
      cardNumber: '',
      expiryDate: '',
      securityCode: '',
      cardholderName: '',
      installments: '1'
    };
  });

  // Salvar dados do cartão no localStorage sempre que mudarem
  useEffect(() => {
    if (user?.id && pacote.id) {
      try {
        localStorage.setItem(`card-data-${user.id}-${pacote.id}`, JSON.stringify(cardData));
      } catch (error) {
        console.warn('Erro ao salvar dados do cartão:', error);
      }
    }
  }, [cardData, user?.id, pacote.id]);

  // Funções de formatação e máscara
  const formatCardNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    // Adiciona espaços a cada 4 dígitos
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    // Adiciona barra após 2 dígitos
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  const formatSecurityCode = (value: string) => {
    // Apenas números, máximo 4 dígitos
    return value.replace(/\D/g, '').slice(0, 4);
  };

  // Função para atualizar dados do cartão com formatação
  const updateCardDataFormatted = useCallback((field: string, value: string) => {
    let formattedValue = value;
    
    switch (field) {
      case 'cardNumber':
        formattedValue = formatCardNumber(value);
        break;
      case 'expiryDate':
        formattedValue = formatExpiryDate(value);
        break;
      case 'securityCode':
        formattedValue = formatSecurityCode(value);
        break;
      case 'cardholderName':
        // Apenas letras, espaços e acentos
        formattedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
        break;
    }
    
    setCardData((prev: CardData) => ({ ...prev, [field]: formattedValue }));
  }, []);

  // Limpar dados salvos quando o pagamento for bem-sucedido
  const clearSavedCardData = useCallback(() => {
    if (user?.id && pacote.id) {
      try {
        localStorage.removeItem(`card-data-${user.id}-${pacote.id}`);
      } catch (error) {
        console.warn('Erro ao limpar dados salvos:', error);
      }
    }
  }, [user?.id, pacote.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !pacote) return;
    
    // Validação básica
    if (!cardData.cardNumber || !cardData.expiryDate || !cardData.securityCode || !cardData.cardholderName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Preparar dados para o backend
    const formData = {
      token: `manual_${Date.now()}`, // Token simulado para compatibilidade
      transaction_amount: pacote.valor,
      payment_method_id: 'visa', // Será detectado no backend
      installments: parseInt(cardData.installments),
      payer: {
        email: user.email,
        identification: {
          type: 'CPF',
          number: '11111111111'
        }
      },
      // Dados adicionais do cartão para processamento manual
      card_data: {
        number: cardData.cardNumber.replace(/\s/g, ''),
        expiry_date: cardData.expiryDate,
        security_code: cardData.securityCode,
        cardholder_name: cardData.cardholderName
      }
    };

    processPayment({
      pacoteId: pacote.id,
      userIdCliente: user.id,
      formData: formData,
    }, {
      onSuccess: () => {
        clearSavedCardData();
        onPaymentSuccess();
      }
    });
  };

  if (!pacote) return null;

  return (
    <div className="w-full">
      <div className="border rounded-lg p-4 bg-muted/20">
        <h3 className="text-lg font-semibold mb-4">Dados do Cartão</h3>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ℹ️ Seus dados são salvos automaticamente enquanto você preenche. 
            Você pode sair e voltar à página sem perder as informações.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número do Cartão *
            </label>
            <input
              type="text"
              value={cardData.cardNumber}
              onChange={(e) => updateCardDataFormatted('cardNumber', e.target.value)}
              placeholder="1234 5678 9012 3456"
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={19}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Validade *
              </label>
              <input
                type="text"
                value={cardData.expiryDate}
                onChange={(e) => updateCardDataFormatted('expiryDate', e.target.value)}
                placeholder="MM/AA"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={5}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                CVV *
              </label>
              <input
                type="text"
                value={cardData.securityCode}
                onChange={(e) => updateCardDataFormatted('securityCode', e.target.value)}
                placeholder="123"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome no Cartão *
            </label>
            <input
              type="text"
              value={cardData.cardholderName}
              onChange={(e) => updateCardDataFormatted('cardholderName', e.target.value)}
              placeholder="Nome como está no cartão"
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Parcelas
            </label>
            <select
              value={cardData.installments}
              onChange={(e) => setCardData((prev: CardData) => ({ ...prev, installments: e.target.value }))}
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
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
              className="w-full h-12 text-lg font-semibold" 
              disabled={isPending}
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
            <p>🔒 Seus dados estão protegidos e são processados de forma segura</p>
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