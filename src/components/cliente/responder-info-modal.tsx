import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Info, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ResponderInfoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: { id_pedido_serial: string; titulo?: string | null } | null;
  solicitacao: { id: string; adminFeedback: string } | null;
  textoResposta: string;
  onTextoRespostaChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLoadingDetails: boolean;
}

export function ResponderInfoModal({
  isOpen,
  onOpenChange,
  pedido,
  solicitacao,
  textoResposta,
  onTextoRespostaChange,
  onSubmit,
  isSubmitting,
  isLoadingDetails,
}: ResponderInfoModalProps) {

  if (!pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder Solicitação de Informação</DialogTitle>
          <DialogDescription>
            Pedido: #{pedido.id_pedido_serial} - {pedido.titulo || "Sem título"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Carregando detalhes da solicitação...</p>
          </div>
        ) : solicitacao && solicitacao.adminFeedback ? (
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="admin-request-details" className="text-base font-semibold text-foreground flex items-center">
                <Info className="h-5 w-5 mr-2 text-blue-500" />
                Informação Solicitada pelo Administrador:
              </Label>
              <div 
                id="admin-request-details" 
                className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap max-h-40 overflow-y-auto"
              >
                {solicitacao.adminFeedback}
              </div>
            </div>
            
            <div className="grid w-full gap-1.5">
              <Label htmlFor="resposta-cliente" className="text-base font-semibold text-foreground">
                Sua Resposta:
              </Label>
              <Textarea
                id="resposta-cliente"
                placeholder="Digite sua resposta aqui..."
                value={textoResposta}
                onChange={(e) => onTextoRespostaChange(e.target.value)}
                rows={5}
                className="min-h-[100px] focus-visible:ring-primary"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Forneça as informações solicitadas para que o administrador possa continuar com seu pedido.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Não foi possível carregar os detalhes da solicitação.</p>
          </div>
        )}

        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting || isLoadingDetails}>
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={onSubmit}
            disabled={isSubmitting || isLoadingDetails || !textoResposta.trim() || !solicitacao}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar Resposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 