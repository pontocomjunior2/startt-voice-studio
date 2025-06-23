import { useEffect, useState, memo } from 'react';
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

const CreditCardForm = memo(({ pacote, onPaymentSuccess }: CreditCardFormProps) => {
  const { user } = useAuth();
  const { mutate: processPayment, isPending } = useProcessCardPayment();
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [cardForm, setCardForm] = useState<any>(null);

  // Inicializar SDK do Mercado Pago
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MercadoPago && !mpInstance) {
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, {
        locale: 'pt-BR'
      });
      setMpInstance(mp);
      console.log('✅ [MP SDK] Instância criada');
    }
  }, [mpInstance]);

  // Inicializar CardForm
  useEffect(() => {
    if (mpInstance && !cardForm) {
      const cardFormInstance = mpInstance.cardForm({
        amount: pacote.valor.toString(),
        iframe: true,
        form: {
          id: "form-checkout",
          cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número do cartão" },
          expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/YY" },
          securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
          cardholderName: { id: "form-checkout__cardholderName", placeholder: "Titular do cartão" },
          issuer: { id: "form-checkout__issuer", placeholder: "Banco emissor" },
          installments: { id: "form-checkout__installments", placeholder: "Parcelas" },
          identificationType: { id: "form-checkout__identificationType", placeholder: "Tipo de documento" },
          identificationNumber: { id: "form-checkout__identificationNumber", placeholder: "Número do documento" },
          cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "E-mail" }
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.error('❌ [MP CardForm] Erro:', error);
              return;
            }
            console.log('✅ [MP CardForm] Formulário pronto');
          },
          onSubmit: (event: any) => {
            event.preventDefault();
            handleSubmit();
          },
          onFetching: (resource: any) => {
            console.log('🔄 [MP CardForm] Carregando:', resource);
            const progressBar = document.querySelector(".progress-bar") as HTMLElement;
            if (progressBar) progressBar.removeAttribute("value");
            return () => {
              if (progressBar) progressBar.setAttribute("value", "0");
            };
          }
        }
      });
      setCardForm(cardFormInstance);
    }
  }, [mpInstance, cardForm, pacote.valor]);

  const handleSubmit = async () => {
    if (!cardForm || !user) return;

    setIsCreatingToken(true);
    try {
      const cardFormData = cardForm.getCardFormData();
      
      if (!cardFormData?.token) {
        throw new Error('Token não foi criado');
      }

      const formData = {
        token: cardFormData.token,
        transaction_amount: cardFormData.amount,
        payment_method_id: cardFormData.paymentMethodId,
        installments: cardFormData.installments,
        payer: {
          email: cardFormData.cardholderEmail,
          identification: {
            type: cardFormData.identificationType,
            number: cardFormData.identificationNumber
          }
        }
      };

      processPayment({
        pacoteId: pacote.id,
        userIdCliente: user.id,
        formData
      }, {
        onSuccess: onPaymentSuccess
      });

    } catch (error: any) {
      console.error('❌ [ERRO]:', error);
      toast.error('Erro ao processar cartão', {
        description: error.message || 'Verifique os dados e tente novamente.'
      });
    } finally {
      setIsCreatingToken(false);
    }
  };

  const isProcessing = isPending || isCreatingToken;

  if (!pacote) return null;

  return (
    <div className="w-full">
      <div className="border rounded-lg p-4 bg-muted/20">
        <h3 className="text-lg font-semibold mb-4">Dados do Cartão</h3>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ℹ️ Use dados de teste: 4074 7000 0000 0002 (OTHE - recusado) ou 4074 7000 0000 0001 (APRO - aprovado)
          </p>
        </div>

        <form id="form-checkout" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Número do Cartão *</label>
            <div id="form-checkout__cardNumber" className="w-full min-h-[48px] p-3 border rounded-md bg-background"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Validade *</label>
              <div id="form-checkout__expirationDate" className="w-full min-h-[48px] p-3 border rounded-md bg-background"></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CVV *</label>
              <div id="form-checkout__securityCode" className="w-full min-h-[48px] p-3 border rounded-md bg-background"></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nome no Cartão *</label>
            <input
              type="text"
              id="form-checkout__cardholderName"
              placeholder="APRO ou OTHE"
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Banco Emissor</label>
              <select id="form-checkout__issuer" className="w-full p-3 border rounded-md bg-background" disabled={isProcessing}>
                <option value="" disabled selected>Selecione o banco</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parcelas</label>
              <select id="form-checkout__installments" className="w-full p-3 border rounded-md bg-background" disabled={isProcessing}>
                <option value="" disabled selected>Selecione as parcelas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Documento</label>
              <select id="form-checkout__identificationType" className="w-full p-3 border rounded-md bg-background" disabled={isProcessing}>
                <option value="" disabled selected>Selecione o tipo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número do Documento</label>
              <input
                type="text"
                id="form-checkout__identificationNumber"
                placeholder="12345678901"
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              id="form-checkout__cardholderEmail"
              defaultValue={user?.email || ''}
              className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isProcessing}
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold" 
              disabled={isProcessing}
            >
              {isCreatingToken ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Validando Cartão...
                </>
              ) : isPending ? (
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

          <progress value="0" className="progress-bar w-full h-2 rounded">Carregando...</progress>

          <div className="text-xs text-muted-foreground text-center pt-2">
            <p>🔒 CardForm oficial do Mercado Pago SDK v2</p>
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