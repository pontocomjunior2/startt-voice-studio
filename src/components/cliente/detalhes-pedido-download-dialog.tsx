import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, History, DownloadCloud, Download, Info, Paperclip, ThumbsUp, Clock, MessageSquareWarning, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Pedido, TipoStatusPedido } from '@/types/pedido.type';
import { usePedidoComRevisoesRealtime } from "@/hooks/realtime/use-pedido-com-revisoes-realtime.hook";
import type { SolicitacaoRevisaoParaCliente, VersaoAudioRevisadoCliente, RevisaoStatusAdmin } from "@/types/revisao.type";
import { PEDIDO_STATUS } from "@/types/pedido.type";
import { REVISAO_STATUS_ADMIN } from "@/types/revisao.type";

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

// Função auxiliar para determinar o ícone e a cor do status da revisão
const getStatusInfo = (status: RevisaoStatusAdmin[keyof RevisaoStatusAdmin] | string | undefined) => {
  switch (status) {
    case REVISAO_STATUS_ADMIN.SOLICITADA:
      return { icon: Clock, color: "text-blue-500", label: "Solicitada" };
    case REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN:
      return { icon: Loader2, color: "text-yellow-500 animate-spin", label: "Em Análise pelo Admin" };
    case REVISAO_STATUS_ADMIN.REVISADO_FINALIZADO:
      return { icon: CheckCircle, color: "text-green-500", label: "Revisado e Finalizado" };
    case REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE:
      return { icon: MessageSquareWarning, color: "text-orange-500", label: "Informações Solicitadas" };
    case REVISAO_STATUS_ADMIN.NEGADA:
      return { icon: XCircle, color: "text-red-500", label: "Negada" };
    default:
      return { icon: AlertCircle, color: "text-gray-500", label: status || "Desconhecido" };
  }
};

export const DetalhesPedidoDownloadDialog: React.FC<DetalhesPedidoDownloadDialogProps> = ({
  isOpen,
  onOpenChange,
  pedido: pedidoInicial,
}) => {
  const {
    pedidoEmTempoReal,
    revisoesEmTempoReal,
    loadingRealtime,
    errorRealtime,
    refetchPedidoComRevisoes,
  } = usePedidoComRevisoesRealtime(pedidoInicial?.id);

  const pedidoDisplay = pedidoEmTempoReal || pedidoInicial;
  const historicoRevisoes: SolicitacaoRevisaoParaCliente[] = revisoesEmTempoReal || [];

  useEffect(() => {
    if (isOpen && pedidoInicial?.id) {
      refetchPedidoComRevisoes();
    }
  }, [isOpen, pedidoInicial?.id, refetchPedidoComRevisoes]);

  if (!pedidoInicial) return null;

  if (pedidoDisplay) {
    console.log('DEBUG DetalhesPedidoDownloadDialog pedidoDisplay:', pedidoDisplay);
  }

  const handleDirectDownload = (url: string | null | undefined, nomeBase: string) => {
    if (!url) {
      console.error("URL de download inválida.");
      alert("URL de download inválida.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = url;
      const fileName = url.substring(url.lastIndexOf('/') + 1) || `${nomeBase}_${pedidoDisplay.id_pedido_serial}.mp3`;
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
            {/* Tentativa final para resolver o linter: garantir que pedidoInicial e pedidoDisplay sejam verificados */}
            {pedidoInicial && pedidoDisplay ? `Acompanhe o histórico e baixe as versões do seu pedido #${pedidoDisplay.id_pedido_serial}.` : "Carregando informações do pedido..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 space-y-6 py-4">
          {/* Feedback de Carregamento e Erro do Realtime */}
          {loadingRealtime && !pedidoEmTempoReal && pedidoInicial && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p>Carregando detalhes do pedido em tempo real...</p>
            </div>
          )}
          {errorRealtime && (
            <div className="text-center text-red-600 bg-red-100 dark:bg-red-900/30 p-4 rounded-md my-4">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <p className="font-semibold">Erro ao carregar dados em tempo real:</p>
              <p className="text-sm">{errorRealtime}</p>
              <Button onClick={refetchPedidoComRevisoes} variant="outline" size="sm" className="mt-3 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-800/50">
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Conteúdo principal do modal só é renderizado se pedidoDisplay existir */}
          {pedidoDisplay ? (
            <>
              {/* Detalhes do Pedido Principal - Usa pedidoDisplay */}
              <Card className="shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-xl">Informações do Pedido Principal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <p><strong className="font-medium text-foreground">Nº Pedido:</strong> {pedidoDisplay.id_pedido_serial}</p>
                    <p><strong className="font-medium text-foreground">Data Solicitação:</strong> {formatarDataHora(pedidoDisplay.created_at)}</p>
                    <p className="col-span-1 sm:col-span-2"><strong className="font-medium text-foreground">Título:</strong> {pedidoDisplay.titulo || "Não informado"}</p>
                    <p><strong className="font-medium text-foreground">Locutor:</strong> {pedidoDisplay.locutores?.nome || "N/A"}</p>
                    <p><strong className="font-medium text-foreground">Tipo de Áudio:</strong> <span className="capitalize">{pedidoDisplay.tipo_audio || "N/D"}</span></p>
                    <p>
                      <strong className="font-medium text-foreground">Status Atual:</strong>
                      <Badge
                        variant={
                          pedidoDisplay.status === PEDIDO_STATUS.CONCLUIDO ? "default" :
                          pedidoDisplay.status === PEDIDO_STATUS.CANCELADO || pedidoDisplay.status === PEDIDO_STATUS.REJEITADO ? "destructive" :
                          pedidoDisplay.status === PEDIDO_STATUS.EM_REVISAO || pedidoDisplay.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE ? "outline" :
                          "secondary"
                        }
                        className={cn(
                          "text-sm px-3 py-1",
                          pedidoDisplay.status === PEDIDO_STATUS.CONCLUIDO && "bg-green-100 text-green-700 border-green-700 dark:bg-green-700/20 dark:text-green-300",
                          pedidoDisplay.status === PEDIDO_STATUS.EM_REVISAO && "bg-blue-100 text-blue-700 border-blue-700 dark:bg-blue-700/20 dark:text-blue-300",
                          pedidoDisplay.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && "bg-yellow-100 text-yellow-700 border-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-300",
                          pedidoDisplay.status === PEDIDO_STATUS.PENDENTE && "bg-orange-100 text-orange-700 border-orange-700 dark:bg-orange-700/20 dark:text-orange-300"
                        )}
                      >
                        {pedidoDisplay.status ? pedidoDisplay.status.charAt(0).toUpperCase() + pedidoDisplay.status.slice(1).replace("_", " ") : "N/D"}
                      </Badge>
                    </p>
                  </div>
                  {pedidoDisplay.status === PEDIDO_STATUS.CONCLUIDO && pedidoDisplay.audio_final_url && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-md font-semibold text-foreground mb-2 flex items-center">
                        <ThumbsUp className="h-5 w-5 mr-2 text-green-500" />
                        Áudio Final Entregue
                      </h4>
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-800/20 rounded-md">
                        <div className="flex items-center">
                          <Paperclip className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-300">
                            {pedidoDisplay.audio_final_url.substring(pedidoDisplay.audio_final_url.lastIndexOf('/') + 1) || `audio_final_${pedidoDisplay.id_pedido_serial}.mp3`}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleDirectDownload(pedidoDisplay.audio_final_url, `audio_final_${pedidoDisplay.id_pedido_serial}`)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Áudio Final
                        </Button>
                      </div>
                    </div>
                  )}
                  {pedidoDisplay && pedidoDisplay.status === PEDIDO_STATUS.CANCELADO && pedidoDisplay.admin_cancel_reason && (
                    <div className="mt-4 pt-4 border-t-2 border-destructive bg-destructive/10 rounded-md shadow-sm">
                      <h4 className="text-lg font-bold text-destructive mb-2 flex items-center">
                        <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
                        Pedido Cancelado pelo Atendimento
                      </h4>
                      <div className="p-4 bg-destructive/20 rounded-md text-base text-destructive whitespace-pre-wrap border border-destructive font-semibold">
                        <span className="block font-bold mb-1">Justificativa do Cancelamento:</span>
                        {pedidoDisplay.admin_cancel_reason}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Histórico de Revisões e Downloads - Usa historicoRevisoes */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <History className="h-5 w-5 mr-2 text-primary" />
                  Histórico de Revisões e Versões Entregues
                </h3>
                {!loadingRealtime && !errorRealtime && historicoRevisoes.length === 0 && (
                  <div className="text-center py-8 border border-dashed rounded-md bg-muted/20">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação de revisão encontrada para este pedido até o momento.</p>
                  </div>
                )}

                {historicoRevisoes.length > 0 && (
                  <ul className="space-y-6">
                    {historicoRevisoes.map((solicitacao: SolicitacaoRevisaoParaCliente, idxSol: number) => {
                      const statusInfo = getStatusInfo(solicitacao.statusRevisao);
                      const IconeStatus = statusInfo.icon;

                      return (
                        <li key={solicitacao.id || idxSol} className="border border-border p-4 rounded-lg shadow-sm bg-card">
                          <h4 className="text-md font-semibold text-foreground mb-1 flex justify-between items-center">
                            <span>
                              Solicitação de Revisão {historicoRevisoes.length - idxSol}
                              <span className='text-xs text-muted-foreground ml-1'>(#{solicitacao.id ? solicitacao.id.substring(0, 8) : 'N/A'})</span>
                            </span>
                            <Badge variant={statusInfo.label === "Negada" || statusInfo.label === "Cancelada" ? "destructive" : statusInfo.label === "Revisado e Finalizado" ? "default" : "outline"}
                                   className={cn("text-xs px-2 py-0.5 whitespace-nowrap", statusInfo.color.replace("text-", "border-").replace("500", "500/50"), statusInfo.color.replace("text-", "bg-").replace("500", "500/10"))}
                            >
                               <IconeStatus className={cn("h-3 w-3 mr-1.5", statusInfo.icon === Loader2 && "animate-spin")} /> 
                              {statusInfo.label}
                            </Badge>
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

                          {solicitacao.adminFeedback && (
                            <div className="mb-3 p-3 bg-primary/10 rounded-md">
                              <p className="text-sm font-medium text-primary mb-1">Resposta do Atendimento:</p>
                              <p className="text-sm text-primary/90 whitespace-pre-wrap">
                                {solicitacao.adminFeedback}
                              </p>
                            </div>
                          )}
                            
                          {solicitacao.versoesAudio && solicitacao.versoesAudio.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border/60">
                                <h5 className="text-sm font-semibold text-foreground mb-2">Áudios de Revisão Entregues:</h5>
                                <ul className="space-y-2">
                                  {solicitacao.versoesAudio.sort((a: VersaoAudioRevisadoCliente, b: VersaoAudioRevisadoCliente) => (a.numeroVersao || 0) - (b.numeroVersao || 0)).map((versao: VersaoAudioRevisadoCliente, idxVer: number) => (
                                    <li key={versao.id || idxVer} className="flex items-center justify-between p-2.5 bg-muted/30 dark:bg-muted/10 rounded-md">
                                      <div className="flex items-center">
                                        <Paperclip className="h-4 w-4 mr-2 text-primary" />
                                        <span className="text-xs sm:text-sm text-foreground">
                                          {versao.audioUrl ? versao.audioUrl.substring(versao.audioUrl.lastIndexOf('/') + 1) : `versao_revisada_${versao.numeroVersao || (idxVer + 1)}.mp3`}
                                          {versao.numeroVersao && <span className="text-muted-foreground text-xs ml-1">(v{versao.numeroVersao})</span>}
                                        </span>
                                      </div>
                                      <Button
                                        onClick={() => handleDirectDownload(versao.audioUrl, `revisao_${solicitacao.id?.substring(0,6)}_${versao.numeroVersao || (idxVer + 1)}`)}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs sm:text-sm"
                                        disabled={!versao.audioUrl}
                                      >
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        Baixar
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Caso especial: Revisão Negada sem áudio, ou Info Solicitada sem áudio */}
                            {(solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.NEGADA || solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) && 
                              (!solicitacao.versoesAudio || solicitacao.versoesAudio.length === 0) &&
                              !solicitacao.adminFeedback && (
                                <div className="mt-3 pt-3 border-t border-border/60">
                                   <p className="text-sm text-muted-foreground italic">Nenhum áudio foi anexado para esta atualização de status.</p>
                                </div>
                            )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            // Fallback se pedidoDisplay for nulo e não estiver carregando (improvável devido à lógica anterior)
            !loadingRealtime && (
                <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-10 w-10 mx-auto mb-3" />
                    <p>Não foi possível carregar os detalhes do pedido.</p>
                </div>
            )
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 