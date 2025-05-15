import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, History, DownloadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


import type { Pedido, TipoStatusPedido } from '@/types/pedido.type';
import { useFetchRevisoesParaCliente } from '@/hooks/cliente/use-fetch-revisoes-para-cliente.hook';
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type';


interface DetalhesPedidoDownloadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pedido: Pedido | null;
}

const formatarDataHora = (dataString: string | undefined | null): string => {
  if (!dataString) return 'Data não disponível';
  try {
    return new Date(dataString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return 'Data inválida';
  }
};

export const DetalhesPedidoDownloadDialog: React.FC<DetalhesPedidoDownloadDialogProps> = ({
  isOpen,
  onOpenChange,
  pedido,
}) => {
  const {
    data: historicoRevisoes,
    isLoading: isLoadingHistorico,
    error: errorHistorico,
    refetch: refetchHistorico,
  } = useFetchRevisoesParaCliente(pedido?.id);

  if (!pedido) return null;

  const handleDirectDownload = (url: string | null | undefined, nomeBase: string) => {
    if (!url) {
      console.error("URL de download inválida.");
      alert("URL de download inválida.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = url;
      const fileName = url.substring(url.lastIndexOf('/') + 1) || `${nomeBase}_${pedido.id_pedido_serial}.mp3`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao tentar baixar o áudio:", error);
      alert("Erro ao iniciar o download.");
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes e Downloads do Pedido</DialogTitle>
          <DialogDescription>
            Acompanhe o histórico e baixe as versões do seu pedido #{pedido.id_pedido_serial}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 space-y-6 py-4">
          {/* Detalhes do Pedido Principal */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-xl">Informações do Pedido Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <p><strong className="font-medium text-foreground">Nº Pedido:</strong> {pedido.id_pedido_serial}</p>
                <p><strong className="font-medium text-foreground">Data Solicitação:</strong> {formatarDataHora(pedido.created_at)}</p>
                <p className="col-span-1 sm:col-span-2"><strong className="font-medium text-foreground">Título:</strong> {pedido.titulo || "Não informado"}</p>
                <p><strong className="font-medium text-foreground">Locutor:</strong> {pedido.locutores?.nome || "N/A"}</p>
                <p><strong className="font-medium text-foreground">Tipo de Áudio:</strong> <span className="capitalize">{pedido.tipo_audio || "N/D"}</span></p>
                <p>
                  <strong className="font-medium text-foreground">Status Atual:</strong>
                  {pedido.status && (
                    <Badge 
                      variant={pedido.status === 'concluido' ? 'default' : 'secondary'} 
                      className="ml-2 capitalize"
                    >
                      {pedido.status === 'em_revisao' ? 'Em Revisão' : pedido.status}
                    </Badge>
                  )}
                </p>
              </div>
              {pedido.audio_final_url && (
                <div className="pt-4 mt-3 border-t border-border">
                  <h4 className="text-md font-semibold mb-2 text-foreground">Áudio Original Entregue</h4>
                  <Button
                    onClick={() => handleDirectDownload(pedido.audio_final_url, `pedido_${pedido.id_pedido_serial}_original`)}
                    className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Baixar Áudio Original
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Histórico de Revisões e Downloads */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Histórico de Revisões e Versões Entregues</h3>
            {isLoadingHistorico && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Carregando histórico de revisões...</p>
              </div>
            )}

            {errorHistorico && (
              <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p>Erro ao carregar o histórico: {errorHistorico.message}</p>
                <Button onClick={() => refetchHistorico()} variant="outline" size="sm" className="mt-3">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {!isLoadingHistorico && !errorHistorico && (!historicoRevisoes || historicoRevisoes.length === 0) && (
              <div className="text-center py-8 border border-dashed rounded-md bg-muted/20">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma solicitação de revisão encontrada para este pedido.</p>
              </div>
            )}

            {historicoRevisoes && historicoRevisoes.length > 0 && (
              <ul className="space-y-6">
                {historicoRevisoes.map((solicitacao, idxSol) => {
                  return (
                    <li key={solicitacao.id || idxSol} className="border border-border p-4 rounded-lg shadow-sm bg-card">
                      <h4 className="text-md font-semibold text-foreground mb-1">
                        Solicitação de Revisão {historicoRevisoes.length - idxSol}
                         <span className='text-xs text-muted-foreground ml-1'>(#{solicitacao.id ? solicitacao.id.substring(0, 8) : 'N/A'})</span>
                      </h4>
                      <div className="text-xs text-muted-foreground mb-2 space-x-2">
                        <span>Solicitado em: {formatarDataHora(solicitacao.dataSolicitacao)}</span>
                        {solicitacao.dataConclusaoRevisao && (
                          <span>| Concluída em: {formatarDataHora(solicitacao.dataConclusaoRevisao)}</span>
                        )}
                      </div>
                      
                      <div className="mb-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-foreground mb-1">Sua solicitação de ajuste:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {solicitacao.descricaoCliente || <span className="italic">Não especificado</span>}
                        </p>
                      </div>

                      {solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.NEGADA && solicitacao.adminFeedback && (
                        <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-md">
                          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">Feedback do Atendimento sobre esta solicitação:</p>
                          <p className="text-sm text-orange-600 dark:text-orange-400 whitespace-pre-wrap">
                            {solicitacao.adminFeedback}
                          </p>
                        </div>
                      )}
                      
                      {solicitacao.versoesAudio && solicitacao.versoesAudio.length > 0 ? (
                        <div className="mt-3">
                          <h5 className="text-sm font-semibold text-foreground mb-2">Áudios Revisados Entregues (para esta solicitação):</h5>
                          <ul className="space-y-3">
                            {solicitacao.versoesAudio.map((versao, idxVer) => (
                              <li key={versao.id || idxVer} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">Versão de Revisão {versao.numeroVersao}</p>
                                    <p className="text-xs text-muted-foreground">Enviada em: {formatarDataHora(versao.enviadoEm)}</p>
                                  </div>
                                  <Button
                                    onClick={() => handleDirectDownload(versao.audioUrl, `pedido_${pedido.id_pedido_serial}_rev${solicitacao.id ? solicitacao.id.substring(0,4) : idxSol}_v${versao.numeroVersao}`)}
                                    size="sm"
                                    variant="outline"
                                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary mt-2 sm:mt-0"
                                    disabled={!versao.audioUrl}
                                  >
                                    <DownloadCloud className="mr-2 h-4 w-4" />
                                    Baixar Versão {versao.numeroVersao}
                                  </Button>
                                </div>
                                {versao.comentariosAdmin && (
                                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-md">
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Comentários do Atendimento:</p>
                                    <p className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">
                                      {versao.comentariosAdmin}
                                    </p>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                         solicitacao.statusRevisao !== REVISAO_STATUS_ADMIN.NEGADA && 
                         solicitacao.statusRevisao !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && (
                          <div className="mt-3 text-sm text-muted-foreground italic border-t border-border pt-3">
                            Revisão em processamento pelo atendimento.
                          </div>
                         )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 