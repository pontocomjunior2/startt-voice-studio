"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from '@/contexts/AuthContext';

// Tipos
interface PacoteCredito {
  id: string;
  nome: string;
  creditos: number;
  preco: number;
  precoFormatado: string;
}

// Dados estáticos de exemplo (substitua por fetch do backend futuramente)
const PACOTES: PacoteCredito[] = [
  { id: "starter", nome: "Starter", creditos: 10, preco: 1.99, precoFormatado: "R$ 1,99" },
  { id: "pro", nome: "Pro", creditos: 50, preco: 89.9, precoFormatado: "R$ 89,90" },
  { id: "premium", nome: "Premium", creditos: 150, preco: 249.9, precoFormatado: "R$ 249,90" },
];

export default function ComprarCreditosPage() {
  const { profile, user } = useAuth();
  const [pacoteSelecionadoParaCompra, setPacoteSelecionadoParaCompra] = useState<PacoteCredito | null>(null);
  const [isModalPixOpen, setIsModalPixOpen] = useState(false);
  const [isLoadingQrCode, setIsLoadingQrCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [txidPIX, setTxidPIX] = useState<string | null>(null);
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState<number | null>(null);
  const [qrCodePayload, setQrCodePayload] = useState<string | null>(null);
  const [paymentIdMP, setPaymentIdMP] = useState<string | null>(null);
  const [qrCodeBase64MP, setQrCodeBase64MP] = useState<string | null>(null);
  const [qrCodePayloadMP, setQrCodePayloadMP] = useState<string | null>(null);
  const [tempoRestanteSegundosMP, setTempoRestanteSegundosMP] = useState<number | null>(null);

  const handleAbrirModalPix = async (pacote: PacoteCredito) => {
    if (!profile) {
      toast("Erro de Autenticação", { description: "Usuário não autenticado. Faça login novamente." });
      return;
    }
    setPacoteSelecionadoParaCompra(pacote);
    setIsModalPixOpen(true);
    setPaymentIdMP(null);
    setQrCodeBase64MP(null);
    setQrCodePayloadMP(null);
    setTempoRestanteSegundosMP(null);
    setIsLoadingQrCode(true);
    try {
      const response = await fetch('/api/criar-pagamento-pix-mp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacoteNome: pacote.nome,
          valorTotal: pacote.preco,
          emailCliente: user?.email,
          userIdCliente: profile.id,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erro ao criar pagamento Pix.');
      }
      setPaymentIdMP(result.paymentId);
      setQrCodeBase64MP(result.qrCodeBase64);
      setQrCodePayloadMP(result.qrCodePayload);
      setTempoRestanteSegundosMP(result.tempoExpiracaoSegundos);
    } catch (error: any) {
      console.error("Erro ao criar pagamento Pix MP:", error);
      toast("Erro ao Gerar PIX", { description: error.message });
    } finally {
      setIsLoadingQrCode(false);
    }
  };

  // Contador regressivo Mercado Pago
  useEffect(() => {
    if (isModalPixOpen && tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0 && !isLoadingQrCode) {
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
  }, [isModalPixOpen, tempoRestanteSegundosMP, isLoadingQrCode]);

  const formatarTempoRestante = (segundos: number | null): string => {
    if (segundos === null || segundos < 0) return "00:00";
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-8 px-2 bg-background">
      <h1 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
        Comprar Créditos
      </h1>
      <section className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-6">
        {PACOTES.map((pacote) => (
          <div key={pacote.id} className="flex flex-col items-center border rounded-xl p-6 shadow-sm bg-card">
            <span className="text-lg font-semibold mb-2">{pacote.nome}</span>
            <span className="text-3xl font-bold text-primary mb-2">{pacote.creditos}</span>
            <span className="text-muted-foreground mb-4">créditos</span>
            <span className="text-xl font-bold mb-4">{pacote.precoFormatado}</span>
            <Button
              className="w-full bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground"
              onClick={() => handleAbrirModalPix(pacote)}
              aria-label={`Comprar pacote ${pacote.nome}`}
            >
              Comprar Pacote
            </Button>
          </div>
        ))}
      </section>

      {/* Modal PIX */}
      <Dialog open={isModalPixOpen} onOpenChange={setIsModalPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center bg-clip-text text-transparent bg-gradient-to-r from-startt-blue to-startt-purple">
              Pagamento via PIX
            </DialogTitle>
            {pacoteSelecionadoParaCompra && (
              <DialogDescription className="text-center pt-2">
                Você está adquirindo: <span className="font-semibold">{pacoteSelecionadoParaCompra.nome}</span> ({pacoteSelecionadoParaCompra.creditos} créditos)
                <br />
                Valor: <span className="font-semibold">{pacoteSelecionadoParaCompra.precoFormatado}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            {isLoadingQrCode ? (
              <div className="h-48 w-48 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Carregando QR Code" />
              </div>
            ) : qrCodeBase64MP ? (
              <img src={`data:image/png;base64,${qrCodeBase64MP}`} alt="QR Code PIX" className="h-48 w-48 border rounded-md" width={192} height={192} loading="lazy" />
            ) : (
              <p className="text-destructive">Não foi possível carregar o QR Code.</p>
            )}

            {/* Contador regressivo Mercado Pago */}
            {tempoRestanteSegundosMP !== null && tempoRestanteSegundosMP > 0 && !isLoadingQrCode && (
              <p className="text-center text-lg font-medium mt-3">
                Este QR Code expira em: <span className="text-primary font-bold">{formatarTempoRestante(tempoRestanteSegundosMP)}</span>
              </p>
            )}
            {tempoRestanteSegundosMP === 0 && !isLoadingQrCode && (
              <p className="text-center text-lg font-medium mt-3 text-destructive">
                QR Code Expirado!
              </p>
            )}
            {/* Campo PIX Copia e Cola Mercado Pago */}
            {qrCodePayloadMP && !isLoadingQrCode && (
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
                    className="flex-1 rounded-md border px-2 py-1 text-xs bg-muted text-foreground select-all focus:outline-none focus:ring-2 focus:ring-primary"
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

            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>1. Abra o aplicativo do seu banco e escolha a opção PIX.</p>
              <p>2. Selecione "Pagar com QR Code" e escaneie o código acima.</p>
              <p>3. Confirme o valor e finalize o pagamento.</p>
              <p className="font-semibold mt-2">Após o pagamento, seus créditos podem levar alguns minutos para serem processados e adicionados à sua conta.</p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto bg-gradient-to-r from-startt-blue to-startt-purple text-primary-foreground"
              onClick={() => {
                setIsModalPixOpen(false);
                toast("Aguardando Confirmação", {
                  description: "Seu pagamento está sendo processado. Avisaremos quando os créditos estiverem disponíveis."
                });
              }}
              aria-label="Confirmar pagamento PIX"
            >
              Pagamento Realizado / Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
} 