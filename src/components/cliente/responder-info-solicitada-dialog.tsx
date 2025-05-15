import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SolicitacaoRevisaoParaCliente } from '@/types/revisao.type';

interface ResponderInfoSolicitadaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  solicitacao: SolicitacaoRevisaoParaCliente | null;
  // A função onSubmit agora pode retornar o resultado da action para tratamento de toast, etc.
  onSubmit: (solicitacaoRevisaoId: string, respostaCliente: string) => Promise<any>; 
  referenciaPedido?: { idPedidoSerial?: string, titulo?: string | null };
}

export const ResponderInfoSolicitadaDialog: React.FC<ResponderInfoSolicitadaDialogProps> = ({
  isOpen,
  onOpenChange,
  solicitacao,
  onSubmit,
  referenciaPedido,
}) => {
  const [respostaCliente, setRespostaCliente] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRespostaCliente(''); // Limpa a resposta ao abrir o modal
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!solicitacao) return null;

  const handleSubmit = async () => {
    if (!respostaCliente.trim() || respostaCliente.trim().length < 10) {
      setError("Sua resposta precisa ter pelo menos 10 caracteres.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(solicitacao.id, respostaCliente.trim());
      // O fechamento do modal e toasts são tratados pelo componente pai após o sucesso do onSubmit
    } catch (e: any) {
      console.error("Erro ao submeter resposta:", e);
      setError(e.message || "Ocorreu um erro ao enviar sua resposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isSubmitting) onOpenChange(open); // Previne fechar durante submit
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder à Solicitação de Informações</DialogTitle>
          <DialogDescription>
            Referente à Solicitação de Revisão #{solicitacao.id.substring(0,8)}
            {referenciaPedido?.idPedidoSerial && ` do Pedido #${referenciaPedido.idPedidoSerial}`}
            {referenciaPedido?.titulo && ` (${referenciaPedido.titulo})`}.
            <br />O atendimento solicitou mais informações para prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {solicitacao.adminInfoRequestDetails && (
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center text-blue-700 dark:text-blue-300">
                  <Info className="h-5 w-5 mr-2" />
                  Informação Solicitada pelo Atendimento:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                  {solicitacao.adminInfoRequestDetails}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-2">
            <Label htmlFor="respostaClienteTextarea" className="font-semibold">
              Sua Resposta / Informações Adicionais:
            </Label>
            <Textarea
              id="respostaClienteTextarea"
              placeholder="Forneça os detalhes solicitados ou informações adicionais aqui..."
              value={respostaCliente}
              onChange={(e) => setRespostaCliente(e.target.value)}
              rows={5}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres. Máximo de 2000 caracteres.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !respostaCliente.trim() || respostaCliente.trim().length < 10}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Resposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 