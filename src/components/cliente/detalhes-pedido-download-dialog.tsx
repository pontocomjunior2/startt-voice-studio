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
import { Loader2, AlertTriangle, History, Download, Paperclip, ThumbsUp, Clock, MessageSquareWarning, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Pedido } from '@/types/pedido.type';
import { usePedidoComRevisoesRealtime } from "@/hooks/realtime/use-pedido-com-revisoes-realtime.hook";
import type { SolicitacaoRevisaoParaCliente, VersaoAudioRevisadoCliente, RevisaoStatusAdmin } from "@/types/revisao.type";

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

  const handleDirectDownload = (url: string | null | undefined, nomeBase: string) => {
    if (!url) {
      console.error("URL de download inválida.");
      alert("URL de download inválida.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = url;
      const fileName = url.substring(url.lastIndexOf('/') + 1) || `${nomeBase}_${pedidoDisplay?.id_pedido_serial || 'pedido'}.mp3`;
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
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col bg-neutral-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Detalhes do Pedido e Histórico de Revisões</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {pedidoInicial && pedidoDisplay ? `Acompanhe os detalhes e o histórico de revisões para o pedido: #${pedidoDisplay.id_pedido_serial} - ${pedidoDisplay.titulo || ''}` : "Carregando informações do pedido..."}
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

          {/* Timeline visual do andamento do pedido */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <History className="h-5 w-5 mr-2 text-blue-400" />
              Andamento do Pedido
            </h3>
            <div className="relative pl-6">
              <div className="absolute top-0 left-2 w-1 bg-neutral-700 h-full rounded" style={{zIndex:0}} />
              <ul className="space-y-10">
                {/* Timeline das revisões (mais recente primeiro) */}
                {historicoRevisoes.slice().reverse().map((solicitacao: SolicitacaoRevisaoParaCliente, idxSol: number) => {
                  const statusInfo = getStatusInfo(solicitacao.statusRevisao);
                  const IconeStatus = statusInfo.icon;
                  return (
                    <li key={solicitacao.id || idxSol} className="relative z-10">
                      <span className="absolute -left-6 top-2 w-4 h-4 rounded-full bg-blue-500 border-4 border-neutral-900 flex items-center justify-center">
                        <IconeStatus className="h-3 w-3 text-white" />
                      </span>
                      <div className="ml-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-white">Revisão {historicoRevisoes.length - idxSol}</span>
                          <Badge variant={statusInfo.label === "Negada" || statusInfo.label === "Cancelada" ? "destructive" : statusInfo.label === "Revisado e Finalizado" ? "default" : "outline"}
                            className={cn("text-xs px-2 py-0.5 whitespace-nowrap", statusInfo.color.replace("text-", "border-").replace("500", "400"), statusInfo.color.replace("text-", "bg-").replace("500", "900/30"))}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-400 mb-2">
                          Solicitado em: {formatarDataHora(solicitacao.dataSolicitacao)}
                          {solicitacao.dataConclusaoRevisao && (
                            <span> | Concluída em: {formatarDataHora(solicitacao.dataConclusaoRevisao)}</span>
                          )}
                        </div>
                        <div className="mb-3 p-3 bg-neutral-900/60 rounded-md">
                          <p className="text-sm font-medium text-white mb-1">Sua solicitação (descrição):</p>
                          <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                            {solicitacao.descricaoCliente || <span className="italic">Não especificado</span>}
                          </p>
                        </div>
                        {solicitacao.adminFeedback && (
                          <div className="mb-3 p-3 bg-blue-900/40 rounded-md">
                            <p className="text-sm font-medium text-blue-300 mb-1">Feedback do Administrador:</p>
                            <p className="text-sm text-blue-200 whitespace-pre-wrap">
                              {solicitacao.adminFeedback}
                            </p>
                          </div>
                        )}
                        {solicitacao.versoesAudio && solicitacao.versoesAudio.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-neutral-700">
                            <h5 className="text-sm font-semibold text-white mb-2">Áudios Revisados Entregues:</h5>
                            <ul className="space-y-2">
                              {solicitacao.versoesAudio.sort((a: VersaoAudioRevisadoCliente, b: VersaoAudioRevisadoCliente) => (a.numeroVersao || 0) - (b.numeroVersao || 0)).map((versao: VersaoAudioRevisadoCliente, idxVer: number) => (
                                <li key={versao.id || idxVer} className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-md">
                                  <div className="flex items-center">
                                    <Paperclip className="h-4 w-4 mr-2 text-blue-400" />
                                    <span className="text-xs sm:text-sm text-white">
                                      {versao.audioUrl ? versao.audioUrl.substring(versao.audioUrl.lastIndexOf('/') + 1) : `versao_revisada_${versao.numeroVersao || (idxVer + 1)}.mp3`}
                                      {versao.numeroVersao && <span className="text-neutral-400 text-xs ml-1">(v{versao.numeroVersao})</span>}
                                    </span>
                                  </div>
                                  <Button
                                    onClick={() => handleDirectDownload(versao.audioUrl, `revisao_${solicitacao.id?.substring(0,6)}_${versao.numeroVersao || (idxVer + 1)}`)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs sm:text-sm text-white border-neutral-700 hover:bg-neutral-800"
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
                        {(solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.NEGADA || solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) && 
                          (!solicitacao.versoesAudio || solicitacao.versoesAudio.length === 0) &&
                          !solicitacao.adminFeedback && (
                            <div className="mt-3 pt-3 border-t border-neutral-700">
                               <p className="text-sm text-neutral-400 italic">Nenhum áudio foi anexado para esta atualização de status.</p>
                            </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {/* Timeline: Áudio Original */}
                <li className="relative z-10">
                  <span className="absolute -left-6 top-2 w-4 h-4 rounded-full bg-green-500 border-4 border-neutral-900 flex items-center justify-center">
                    <ThumbsUp className="h-3 w-3 text-white" />
                  </span>
                  <div className="ml-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">Áudio Original</span>
                    </div>
                    {pedidoDisplay?.audio_final_url && (
                      <Card className="shadow-lg border-none bg-neutral-900 text-white rounded-2xl mt-2">
                        <CardHeader className="bg-transparent p-0">
                          <CardTitle className="text-base text-foreground">Áudio Original Entregue</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm bg-transparent p-0">
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <audio
                              controls
                              src={pedidoDisplay.audio_final_url}
                              className="w-full max-w-md bg-neutral-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Áudio original entregue ao cliente"
                            >
                              Seu navegador não suporta o elemento de áudio.
                            </audio>
                            <Button
                              onClick={() => handleDirectDownload(pedidoDisplay?.audio_final_url, `original_${pedidoDisplay?.id_pedido_serial}`)}
                              size="sm"
                              variant="outline"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 sm:mt-0"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Baixar Original
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </li>
              </ul>
            </div>
          </div>
          {/* Detalhes do Pedido Principal - Usa pedidoDisplay */}
          {pedidoDisplay && (
            <Card className="shadow-sm rounded-lg bg-neutral-800 text-white border-none">
              <CardHeader>
                <CardTitle className="text-xl text-white">Informações do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                  <div className="font-medium text-neutral-300">Nº Pedido:</div>
                  <div className="md:col-span-2">{pedidoDisplay?.id_pedido_serial}</div>
                  <div className="font-medium text-neutral-300">Data/Hora:</div>
                  <div className="md:col-span-2">{formatarDataHora(pedidoDisplay?.created_at)}</div>
                  <div className="font-medium text-neutral-300">Título:</div>
                  <div className="md:col-span-2">{pedidoDisplay?.titulo || <span className="italic text-neutral-400">N/A</span>}</div>
                  <div className="font-medium text-neutral-300">Locutor:</div>
                  <div className="md:col-span-2">{pedidoDisplay?.locutores?.nome || <span className="italic text-neutral-400">Não definido</span>}</div>
                  <div className="font-medium text-neutral-300">Estilo de Áudio:</div>
                  <div className="md:col-span-2">{pedidoDisplay?.estilo_locucao || <span className="italic text-neutral-400">N/A</span>}</div>
                  <div className="font-medium text-neutral-300 self-start">Tipo de Áudio:</div>
                  <div className="md:col-span-2">
                    {pedidoDisplay?.tipo_audio ? (
                      <Badge 
                        variant={pedidoDisplay.tipo_audio.toLowerCase() === 'off' ? 'secondary' : 'default'}
                        className={cn(
                          "text-xs px-2 py-0.5 font-semibold",
                          pedidoDisplay.tipo_audio.toLowerCase() === 'off' && "bg-amber-100 text-amber-700 border-amber-300",
                          pedidoDisplay.tipo_audio.toLowerCase() === 'produzido' && "bg-green-100 text-green-700 border-green-300",
                          pedidoDisplay.tipo_audio.toLowerCase() !== 'off' && pedidoDisplay.tipo_audio.toLowerCase() !== 'produzido' && "bg-gray-100 text-gray-700 border-gray-300"
                        )}
                      >
                        {pedidoDisplay.tipo_audio.toLowerCase() === 'off' ? 'Áudio em OFF' 
                          : pedidoDisplay.tipo_audio.toLowerCase() === 'produzido' ? 'Áudio Produzido' 
                          : pedidoDisplay.tipo_audio}
                      </Badge>
                    ) : (
                      <span className="italic text-neutral-400">Não especificado</span>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-neutral-300 mb-1">Orientações (Briefing):</h4>
                  <div className="p-3 bg-neutral-900 rounded-md max-h-32 overflow-y-auto text-xs whitespace-pre-wrap border-none">
                    {pedidoDisplay.orientacoes || <span className="italic text-neutral-400">Nenhuma orientação fornecida.</span>}
                  </div>
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-neutral-300 mb-1">Roteiro Completo:</h4>
                  <div className="p-3 bg-neutral-900 rounded-md max-h-40 overflow-y-auto text-xs whitespace-pre-wrap border-none">
                    {pedidoDisplay.texto_roteiro || <span className="italic text-neutral-400">Nenhum roteiro fornecido.</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button type="button" variant="outline" className="text-white border-neutral-700 hover:bg-neutral-800" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 