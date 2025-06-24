import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFetchPublicPacote } from '@/hooks/queries/use-fetch-public-pacote.hook';
import { useFetchLocutoresForPacote } from '@/hooks/queries/use-fetch-locutores-for-pacote.hook';
import { Loader2, Copy, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import CreditCardForm from '@/components/cliente/credit-card-form';
import { initMercadoPago } from '@mercadopago/sdk-react';

function PaginaCompraPacote() {
  const { pacoteId } = useParams<{ pacoteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const { data: pacote, isLoading: isLoadingPacote, isError: isErrorPacote, error: errorPacote } = useFetchPublicPacote(pacoteId!);
  const { data: locutores, isLoading: isLoadingLocutores } = useFetchLocutoresForPacote(pacoteId!);

  // States from comprar-creditos-page
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isLoadingQrCode, setIsLoadingQrCode] = useState(false);
  const [qrCodeBase64MP, setQrCodeBase64MP] = useState<string | null>(null);
  const [qrCodePayloadMP, setQrCodePayloadMP] = useState<string | null>(null);
  const [tempoRestanteSegundosMP, setTempoRestanteSegundosMP] = useState<number | null>(null);
  const [isMPSdkReady, setIsMPSdkReady] = useState(false);
  const [forceFormRemount] = useState(0);

  // Initialize Mercado Pago SDK
  useEffect(() => {
    if (!isMPSdkReady) {
      initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY!, { locale: 'pt-BR' });
      setIsMPSdkReady(true);
    }
  }, [isMPSdkReady]);
  
  const generatePix = useCallback(async () => {
    if (!pacote || !profile || !user) return;
    setIsLoadingQrCode(true);
    try {
      const response = await fetch('/api/criar-pagamento-pix-mp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacoteNome: pacote.nome,
          valorTotal: pacote.valor,
          emailCliente: user?.email,
          userIdCliente: profile.id,
          pacoteId: pacote.id,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Erro ao criar pagamento Pix.');
      setQrCodeBase64MP(result.qrCodeBase64);
      setQrCodePayloadMP(result.qrCodePayload);
      setTempoRestanteSegundosMP(result.tempoExpiracaoSegundos);
    } catch (error: any) {
      toast("Erro ao Gerar PIX", { description: error.message });
    } finally {
      setIsLoadingQrCode(false);
    }
  }, [pacote, profile, user]);

  const handlePaymentMethodChange = useCallback((method: string) => {
    if (!user) {
      toast.info("Faça login para continuar", {
        description: "Você precisa estar logado para selecionar um método de pagamento.",
      });
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setSelectedPaymentMethod(method);
    
    if (method === 'pix' && pacote && !qrCodeBase64MP) {
      generatePix();
    }
  }, [user, navigate, location.pathname, pacote, qrCodeBase64MP, generatePix]);
  
  useEffect(() => {
    if (tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0) {
      const timer = setInterval(() => {
        setTempoRestanteSegundosMP((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            toast("PIX Expirado", { description: "O QR Code para pagamento expirou. Por favor, gere um novo." });
            setQrCodeBase64MP(null);
            setQrCodePayloadMP(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tempoRestanteSegundosMP]);

  const formatarTempoRestante = (segundos: number | null): string => {
    if (segundos === null || segundos < 0) return "00:00";
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handlePaymentSuccess = useCallback(() => {
    toast.success("Pagamento realizado com sucesso!", {
      description: "Seus créditos foram adicionados. Você será redirecionado para o dashboard.",
    });
    setTimeout(() => navigate('/dashboard'), 3000);
  }, [navigate]);

  const creditCardFormMemo = useMemo(() => {
    if (!pacote) return null;
    
    return (
      <CreditCardForm 
        key={`credit-card-${pacote.id}-${forceFormRemount}`}
        pacote={pacote}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }, [pacote, handlePaymentSuccess, forceFormRemount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoadingPacote) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isErrorPacote) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Erro</h2>
          <p className="text-muted-foreground">{errorPacote?.message || "Não foi possível carregar os detalhes do pacote."}</p>
        </div>
      </div>
    );
  }

  if (!pacote) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Pacote não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <Badge variant="secondary" className="w-fit mb-2">Pacote Exclusivo</Badge>
            <CardTitle className="text-3xl font-bold">{pacote?.nome}</CardTitle>
            <CardDescription>{pacote?.descricao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-baseline p-6 bg-slate-100 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Você recebe</p>
                <p className="text-2xl font-bold text-amber-600">{pacote?.creditos_oferecidos} créditos</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Pelo valor de</p>
                <p className="text-2xl font-bold">{formatCurrency(pacote?.valor || 0)}</p>
              </div>
            </div>
            
            {locutores && locutores.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h3 className="text-lg font-semibold mb-3">Locutores Incluídos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {isLoadingLocutores ? <p>Carregando...</p> : locutores.map(locutor => (
                    <div key={locutor.id} className="flex items-center space-x-3">
                       <Avatar>
                        <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome} />
                        <AvatarFallback>{locutor.nome.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{locutor.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <Separator className='my-4' />

          {/* Payment Section */}
          <CardFooter className='flex-col items-start gap-4'>
            <h3 className="text-lg font-semibold text-center w-full">Selecione o método de pagamento</h3>
            <Tabs 
              value={selectedPaymentMethod || ''} 
              onValueChange={handlePaymentMethodChange} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pix"><QrCode className="mr-2 h-4 w-4"/> PIX</TabsTrigger>
                <TabsTrigger value="card"><CreditCard className="mr-2 h-4 w-4"/> Cartão de Crédito</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Placeholder for when no payment method is selected */}
            <div className={cn("text-center p-10 border-dashed border-2 mt-4 rounded-lg w-full", selectedPaymentMethod ? "hidden" : "block")}>
              <p className="text-muted-foreground">Selecione uma forma de pagamento acima.</p>
            </div>

            {/* PIX Content */}
            <div className={cn("w-full mt-4", selectedPaymentMethod === 'pix' ? 'block' : 'hidden')}>
              <Card>
                <CardContent className="py-6 flex flex-col items-center justify-center space-y-3">
                  {isLoadingQrCode ? (
                    <div className="h-40 w-40 flex items-center justify-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Carregando QR Code" />
                    </div>
                  ) : qrCodeBase64MP ? (
                    <img src={`data:image/png;base64,${qrCodeBase64MP}`} alt="QR Code PIX" className="h-40 w-40 border rounded-md" width={160} height={160} loading="lazy" />
                  ) : (
                    <p className="text-destructive">Não foi possível carregar o QR Code.</p>
                  )}

                  {tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0 && (
                    <p className="text-center text-lg font-medium mt-3">
                      Este QR Code expira em: <span className="text-primary font-bold">{formatarTempoRestante(tempoRestanteSegundosMP)}</span>
                    </p>
                  )}
                  {tempoRestanteSegundosMP === 0 && (
                    <p className="text-center text-lg font-medium mt-3 text-destructive">
                      QR Code Expirado! Clique em PIX novamente para gerar um novo.
                    </p>
                  )}
                  {qrCodePayloadMP && (
                    <div className="w-full flex flex-col items-center mt-2">
                      <label htmlFor="pix-copia-e-cola" className="text-sm font-medium text-muted-foreground mb-1">
                        Código Copia e Cola:
                      </label>
                      <div className="flex w-full max-w-xs gap-2">
                        <input
                          id="pix-copia-e-cola"
                          type="text"
                          value={qrCodePayloadMP}
                          readOnly
                          className="flex-1 rounded-md border border-neutral-700 px-2 py-1 text-xs bg-neutral-900 text-white select-all focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label="Código PIX Copia e Cola"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            if (qrCodePayloadMP) {
                              navigator.clipboard.writeText(qrCodePayloadMP);
                              toast("Código copiado!", { description: "O código PIX foi copiado para sua área de transferência." });
                            }
                          }}
                          aria-label="Copiar código PIX Copia e Cola"
                        >
                          <Copy className="h-4 w-4" />
            </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Credit Card Content */}
            <div className={cn("w-full mt-4", selectedPaymentMethod === 'card' ? 'block' : 'hidden')}>
              <Card>
                <CardHeader>
                  <CardTitle>Pagamento com Cartão</CardTitle>
                  <CardDescription>Preencha os dados do seu cartão de crédito.</CardDescription>
                </CardHeader>
                <CardContent>
                  {creditCardFormMemo}
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default PaginaCompraPacote; 