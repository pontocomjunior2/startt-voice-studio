"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useFetchListablePacotes } from '@/hooks/queries/use-fetch-listable-pacotes.hook';
import type { Pacote } from "@/hooks/queries/use-fetch-pacotes.hook";
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import CreditCardForm from '@/components/cliente/credit-card-form';
import { initMercadoPago } from '@mercadopago/sdk-react';

export default function ComprarCreditosPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const FORM_STATE_KEY = 'pontocom-card-form-state';
  
  // ✅ CORREÇÃO: Estados iniciam como nulos para garantir o fluxo step-by-step.
  // A restauração a partir do localStorage foi removida.
  const [pacoteSelecionado, setPacoteSelecionado] = useState<Pacote | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [lastSelectedPaymentMethod, setLastSelectedPaymentMethod] = useState<string | null>(null);
  
  const [isLoadingQrCode, setIsLoadingQrCode] = useState(false);
  const [qrCodeBase64MP, setQrCodeBase64MP] = useState<string | null>(null);
  const [qrCodePayloadMP, setQrCodePayloadMP] = useState<string | null>(null);
  const [tempoRestanteSegundosMP, setTempoRestanteSegundosMP] = useState<number | null>(null);
  const [isMPSdkReady, setIsMPSdkReady] = useState(false);
  const [forceFormRemount] = useState(0);

  const { data: pacotes = [], isLoading, isError } = useFetchListablePacotes();

  // ⛔️ REMOVIDO: Todos os `useEffect` que lidavam com `localStorage` para `pacoteSelecionado`
  // e `selectedPaymentMethod` foram removidos para garantir um estado limpo a cada visita.

  // Inicializa o SDK do MP apenas uma vez
  useEffect(() => {
    if (!isMPSdkReady) {
      initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY!, { locale: 'pt-BR' });
      setIsMPSdkReady(true);
    }
  }, [isMPSdkReady]);

  const generatePix = useCallback(async () => {
    if (!pacoteSelecionado || !profile || !user) return;
    setIsLoadingQrCode(true);
    try {
      const response = await fetch('/api/criar-pagamento-pix-mp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacoteNome: pacoteSelecionado.nome,
          valorTotal: pacoteSelecionado.valor,
          emailCliente: user?.email,
          userIdCliente: profile.id,
          pacoteId: pacoteSelecionado.id,
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
  }, [pacoteSelecionado, profile, user]);

  // Função para lidar com mudança de método de pagamento
  const handlePaymentMethodChange = useCallback((method: string) => {
    setSelectedPaymentMethod(method);
    setLastSelectedPaymentMethod(method);
    
    if (method === 'pix' && pacoteSelecionado && !qrCodeBase64MP) {
      generatePix();
    }
  }, [pacoteSelecionado, qrCodeBase64MP, generatePix]);

  const handleSelectPacote = (pacote: Pacote) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (pacoteSelecionado?.id === pacote.id) {
      return;
    }
    
    // Sempre que um novo pacote é selecionado, reinicia o estado do pagamento.
    setPacoteSelecionado(pacote);
    setSelectedPaymentMethod(null);
    setQrCodeBase64MP(null);
    setQrCodePayloadMP(null);
    setTempoRestanteSegundosMP(null);
    localStorage.removeItem(FORM_STATE_KEY); 
  };
  
  // Contador regressivo Mercado Pago
  useEffect(() => {
    if (tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0) {
      const timer = setInterval(() => {
        setTempoRestanteSegundosMP((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            toast("PIX Expirado", { description: "O QR Code para pagamento expirou. Por favor, gere um novo." });
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

  // Função para limpar todo o estado (útil para pagamento bem-sucedido)
  const clearAllState = useCallback(() => {
    // Não precisa mais limpar localStorage, apenas o estado local
    setPacoteSelecionado(null);
    setSelectedPaymentMethod(null);
    setLastSelectedPaymentMethod(null);
    setQrCodeBase64MP(null);
    setQrCodePayloadMP(null);
    setTempoRestanteSegundosMP(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    clearAllState(); 
    toast.success("Pagamento realizado com sucesso!", {
      description: "Seus créditos foram adicionados. Você será redirecionado em breve.",
    });
    setTimeout(() => navigate('/dashboard'), 3000);
  }, [navigate, clearAllState]);

  // Memoizar o CreditCardForm para evitar renderizações desnecessárias
  const creditCardFormMemo = useMemo(() => {
    if (!pacoteSelecionado) return null;
    
    return (
      <CreditCardForm 
        key={`credit-card-${pacoteSelecionado.id}-${forceFormRemount}`}
        pacote={pacoteSelecionado}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }, [pacoteSelecionado?.id, pacoteSelecionado?.valor, handlePaymentSuccess, forceFormRemount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center h-64">
        <p className="text-red-600">Ocorreu um erro ao carregar os pacotes.</p>
        <p className="text-muted-foreground">Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen container mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
          Comprar Créditos
        </h1>
        <p className="text-muted-foreground mt-2">Selecione um pacote para ver as opções de pagamento.</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {pacotes.map((pacote) => (
          <Card 
            key={pacote.id} 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
              pacoteSelecionado?.id === pacote.id ? "ring-2 ring-primary shadow-2xl" : "shadow-sm"
            )}
            onClick={() => handleSelectPacote(pacote)}
          >
            <CardContent className="flex flex-col items-center p-6">
              <span className="text-lg font-semibold mb-2">{pacote.nome}</span>
              <span className="text-3xl font-bold text-primary mb-2">{pacote.creditos_oferecidos}</span>
              <span className="text-muted-foreground mb-4">créditos</span>
              <span className="text-xl font-bold mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pacote.valor)}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {pacoteSelecionado && (
        <section className="max-w-xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-4">Pagamento para: {pacoteSelecionado.nome}</h2>
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

          {/* Placeholder para quando nada está selecionado */}
          <div className={cn("text-center p-10 border-dashed border-2 mt-4 rounded-lg", selectedPaymentMethod ? "hidden" : "block")}>
            <p className="text-muted-foreground">Selecione uma forma de pagamento acima.</p>
          </div>

          {/* Conteúdo do PIX (controlado por visibilidade) */}
          <div className={cn("mt-4", selectedPaymentMethod === 'pix' ? 'block' : 'hidden')}>
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

                {/* Contador regressivo Mercado Pago */}
                {tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0 && (
                  <p className="text-center text-lg font-medium mt-3">
                    Este QR Code expira em: <span className="text-primary font-bold">{formatarTempoRestante(tempoRestanteSegundosMP)}</span>
                  </p>
                )}
                {tempoRestanteSegundosMP === 0 && (
                  <p className="text-center text-lg font-medium mt-3 text-destructive">
                    QR Code Expirado!
                  </p>
                )}
                {/* Campo PIX Copia e Cola Mercado Pago */}
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
          
          {/* Conteúdo do Cartão (controlado por visibilidade, NUNCA desmontado) */}
          <div className={cn("mt-4", selectedPaymentMethod === 'card' ? 'block' : 'hidden')}>
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
        </section>
      )}
    </main>
  );
}