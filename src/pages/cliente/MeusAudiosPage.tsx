import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar caminho se necessário
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card pode ser útil para a mensagem de "nenhum pedido"
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient'; // Ajustar caminho se necessário
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loader2, ListMusic, PlusCircle, DownloadCloud, AlertTriangle, RefreshCw, Edit3, History, Eye, MoreVertical, Trash2, MessageSquare, FileAudio, XCircle, Paperclip, ThumbsUp, MessageSquareWarning, Send, RotateCcw } from 'lucide-react'; // Ícones necessários, Edit3 ou History para revisão, Adicionado Trash2 e MessageSquare
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Link para o botão de novo pedido
import { solicitarRevisaoAction, excluirPedidoAction } from '@/actions/pedido-actions'; // Importar a action
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Para o botão de fechar/cancelar
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PEDIDO_STATUS } from '@/types/pedido.type'; // Manter PEDIDO_STATUS aqui
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type'; // Garantir que esta importação esteja correta
import type { Pedido, TipoStatusPedido } from '@/types/pedido.type'; // Importar tipos com type
import { startOfDay, endOfDay } from 'date-fns';
import { DetalhesPedidoDownloadDialog } from '@/components/cliente/detalhes-pedido-download-dialog';
import { useDropzone } from 'react-dropzone';
import { useFetchRevisoesParaCliente } from '@/hooks/cliente/use-fetch-revisoes-para-cliente.hook';
import { clienteResponderInfoAction } from '@/actions/cliente-actions';
import { useAction } from 'next-safe-action/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerSingle } from '@/components/ui/date-picker-single';
import { Input } from '@/components/ui/input';

// Componente para o Dialog de Histórico de Revisões
interface HistoricoRevisoesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pedido: Pedido | null;
}

// Função auxiliar para determinar o ícone e a cor do status da revisão
const getStatusInfo = (status: string | undefined) => {
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

const HistoricoRevisoesDialog: React.FC<HistoricoRevisoesDialogProps> = ({ isOpen, onOpenChange, pedido }) => {
  const { 
    data: historicoRevisoes, 
    isLoading: isLoadingHistorico, 
    error: errorHistorico,
    refetch: refetchHistorico
  } = useFetchRevisoesParaCliente(pedido?.id);

  if (!pedido) return null;

  const formatarDataHora = (dataString: string | undefined | null) => {
    if (!dataString) return 'Data não disponível';
    try {
      return new Date(dataString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col bg-neutral-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Detalhes do Pedido e Histórico de Revisões</DialogTitle>
          <DialogDescription className="text-neutral-300">
            Acompanhe os detalhes e o histórico de revisões para o pedido: #{pedido.id_pedido_serial} - {pedido.titulo || "Sem título"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 py-4">
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
                {historicoRevisoes && historicoRevisoes.slice().reverse().map((revisao, idxSol) => {
                  const statusInfo = getStatusInfo(revisao.statusRevisao);
                  const IconeStatus = statusInfo.icon;
                  return (
                    <li key={revisao.id || idxSol} className="relative z-10">
                      <span className="absolute -left-6 top-2 w-4 h-4 rounded-full bg-blue-500 border-4 border-neutral-900 flex items-center justify-center">
                        <IconeStatus className="h-3 w-3 text-white" />
                      </span>
                      <div className="ml-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-white">Revisão {historicoRevisoes.length - idxSol}</span>
                          <Badge variant={statusInfo.label === "Negada" || statusInfo.label === "Cancelada" ? "destructive" : statusInfo.label === "Revisado e Finalizado" ? "default" : "outline"}
                            className={cn("text-xs px-2 py-0.5 whitespace-nowrap", statusInfo.color && statusInfo.color.replace("text-", "border-").replace("500", "400"), statusInfo.color && statusInfo.color.replace("text-", "bg-").replace("500", "900/30"))}
                          >
                            {statusInfo.label}
                          </Badge>
                  </div>
                        <div className="text-xs text-neutral-400 mb-2">
                          Solicitado em: {formatarDataHora(revisao.dataSolicitacao)}
                          {revisao.dataConclusaoRevisao && (
                            <span> | Concluída em: {formatarDataHora(revisao.dataConclusaoRevisao)}</span>
                          )}
                </div>
                        <div className="mb-3 p-3 bg-neutral-900/60 rounded-md">
                          <p className="text-sm font-medium text-white mb-1">Sua solicitação (descrição):</p>
                          <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                            {revisao.descricaoCliente || <span className="italic">Não especificado</span>}
                          </p>
                        </div>
                        {revisao.adminFeedback && (
                          <div className="mb-3 p-3 bg-blue-900/40 rounded-md">
                            <p className="text-sm font-medium text-blue-300 mb-1">Feedback do Administrador:</p>
                            <p className="text-sm text-blue-200 whitespace-pre-wrap">
                              {revisao.adminFeedback}
                            </p>
                          </div>
                        )}
                        {revisao.versoesAudio && revisao.versoesAudio.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-neutral-700">
                            <h5 className="text-sm font-semibold text-white mb-2">Áudios Revisados Entregues:</h5>
                            <ul className="space-y-2">
                              {revisao.versoesAudio.sort((a, b) => (a.numeroVersao || 0) - (b.numeroVersao || 0)).map((versao, idxVer) => (
                                <li key={versao.id || idxVer} className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-md">
                                  <div className="flex items-center">
                                    <Paperclip className="h-4 w-4 mr-2 text-blue-400" />
                                    <span className="text-xs sm:text-sm text-white">
                                      {versao.audioUrl ? versao.audioUrl.substring(versao.audioUrl.lastIndexOf('/') + 1) : `versao_revisada_${versao.numeroVersao || (idxVer + 1)}.mp3`}
                                      {versao.numeroVersao && <span className="text-neutral-400 text-xs ml-1">(v{versao.numeroVersao})</span>}
                                    </span>
                                  </div>
                                  <Button
                                    asChild
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 sm:mt-0"
                                  >
                                    <a href={versao.audioUrl} download>
                                      <DownloadCloud className="mr-2 h-4 w-4" />
                                      Baixar
                                    </a>
                </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {revisao.statusRevisao === REVISAO_STATUS_ADMIN.CLIENTE_RESPONDEU && revisao.cliente_info_response_details && (
                          <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-md shadow-sm">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">
                              Sua Resposta (enviada em: {formatarDataHora(revisao.data_resposta_cliente)})
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 whitespace-pre-wrap">
                              {revisao.cliente_info_response_details}
                            </p>
                          </div>
                        )}
                        {(revisao.statusRevisao === REVISAO_STATUS_ADMIN.NEGADA || revisao.statusRevisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) && 
                          (!revisao.versoesAudio || revisao.versoesAudio.length === 0) &&
                          !revisao.adminFeedback && (
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
                    {pedido.audio_final_url && (
                      <Card className="shadow-lg border-none bg-card text-card-foreground rounded-2xl mt-2">
                        <CardHeader className="bg-transparent p-0">
                          <CardTitle className="text-base text-foreground">Áudio Original Entregue</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm bg-transparent p-0">
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <audio
                              controls
                              src={pedido.audio_final_url}
                              className="w-full max-w-md bg-neutral-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Áudio original entregue ao cliente"
                            >
                              Seu navegador não suporta o elemento de áudio.
                            </audio>
                            <Button
                              asChild
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 sm:mt-0"
                            >
                              <a href={pedido.audio_final_url} download>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Baixar Original
                              </a>
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
          {/* Nova Seção: Detalhes do Pedido */}
          <Card className="shadow-sm rounded-lg bg-neutral-800 text-white border-none">
            <CardHeader>
              <CardTitle className="text-xl text-white">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                <div className="font-medium text-neutral-300">Nº Pedido:</div>
                <div className="md:col-span-2">{pedido.id_pedido_serial}</div>
                <div className="font-medium text-neutral-300">Data/Hora:</div>
                <div className="md:col-span-2">{formatarDataHora(pedido.created_at)}</div>
                <div className="font-medium text-neutral-300">Título:</div>
                <div className="md:col-span-2">{pedido.titulo || <span className="italic text-neutral-400">N/A</span>}</div>
                <div className="font-medium text-neutral-300">Locutor:</div>
                <div className="md:col-span-2">{pedido.locutores?.nome || <span className="italic text-neutral-400">Não definido</span>}</div>
                <div className="font-medium text-neutral-300">Estilo de Áudio:</div>
                <div className="md:col-span-2">{pedido.estilo_locucao || <span className="italic text-neutral-400">N/A</span>}</div>
                <div className="font-medium text-neutral-300 self-start">Tipo de Áudio:</div>
                <div className="md:col-span-2">
                  {pedido.tipo_audio ? (
                    <Badge 
                      variant={pedido.tipo_audio.toLowerCase() === 'off' ? 'secondary' : 'default'}
                      className={cn(
                        "text-xs px-2 py-0.5 font-semibold",
                        pedido.tipo_audio.toLowerCase() === 'off' && "bg-amber-100 text-amber-700 border-amber-300",
                        pedido.tipo_audio.toLowerCase() === 'produzido' && "bg-green-100 text-green-700 border-green-300",
                        pedido.tipo_audio.toLowerCase() !== 'off' && pedido.tipo_audio.toLowerCase() !== 'produzido' && "bg-gray-100 text-gray-700 border-gray-300"
                      )}
                    >
                      {pedido.tipo_audio.toLowerCase() === 'off' ? 'Áudio em OFF' 
                       : pedido.tipo_audio.toLowerCase() === 'produzido' ? 'Áudio Produzido' 
                       : pedido.tipo_audio}
                    </Badge>
                  ) : (
                    <span className="italic text-neutral-400">Não especificado</span>
                  )}
                </div>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-300 mb-1">Orientações (Briefing):</h4>
                <div className="p-3 bg-neutral-900 rounded-md max-h-32 overflow-y-auto text-xs whitespace-pre-wrap border-none">
                  {pedido.orientacoes || <span className="italic text-neutral-400">Nenhuma orientação fornecida.</span>}
                </div>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-300 mb-1">Roteiro Completo:</h4>
                <div className="p-3 bg-neutral-900 rounded-md max-h-40 overflow-y-auto text-xs whitespace-pre-wrap border-none">
                  {pedido.texto_roteiro || <span className="italic text-neutral-400">Nenhum roteiro fornecido.</span>}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Seção Existente: Histórico de Revisões */}
          {isLoadingHistorico && (
            <div className="flex flex-col items-center justify-center h-full">
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
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma revisão concluída encontrada para este pedido.</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook de debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function MeusAudiosPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [errorLoadingPedidos, setErrorLoadingPedidos] = useState<string | null>(null);

  const [isRevisaoModalOpen, setIsRevisaoModalOpen] = useState(false);
  const [pedidoParaRevisao, setPedidoParaRevisao] = useState<Pedido | null>(null);
  const [descricaoRevisao, setDescricaoRevisao] = useState("");
  const [submittingRevisao, setSubmittingRevisao] = useState(false);
  
  const [isModoResposta, setIsModoResposta] = useState(false);
  const [solicitacaoParaResponderId, setSolicitacaoParaResponderId] = useState<string | null>(null);

  const [isHistoricoRevisoesModalOpen, setIsHistoricoRevisoesModalOpen] = useState(false);
  const [pedidoParaHistoricoRevisoes, setPedidoParaHistoricoRevisoes] = useState<Pedido | null>(null);

  const [isDetalhesDownloadModalOpen, setIsDetalhesDownloadModalOpen] = useState(false);
  const [pedidoParaDetalhesDownload, setPedidoParaDetalhesDownload] = useState<Pedido | null>(null);

  const [isConfirmarExclusaoModalOpen, setIsConfirmarExclusaoModalOpen] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null);
  const [submittingExclusao, setSubmittingExclusao] = useState(false);

  // NOVO ESTADO: Armazena a mensagem correta a ser exibida no modal
  const [mensagemAdminParaExibir, setMensagemAdminParaExibir] = useState<string | null>(null);

  const [filtroTitulo, setFiltroTitulo] = useState("");
  const debouncedFiltroTitulo = useDebounce(filtroTitulo, 400);
  const [filtroStatus, setFiltroStatus] = useState<string>("__all__");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  const [audioGuiaRevisaoFile, setAudioGuiaRevisaoFile] = useState<File | null>(null);
  const [isUploadingGuiaRevisao, setIsUploadingGuiaRevisao] = useState(false);

  const onDropAudioGuiaRevisao = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setAudioGuiaRevisaoFile(acceptedFiles[0]);
    }
  }, []);

  const {
    getRootProps: getRootPropsGuiaRevisao,
    getInputProps: getInputPropsGuiaRevisao,
    isDragActive: isDragActiveGuiaRevisao
  } = useDropzone({
    onDrop: onDropAudioGuiaRevisao,
    accept: { 'audio/*': [] },
    multiple: false,
  });

  const { execute: executarEnviarResposta, status: statusEnvioResposta } = useAction(clienteResponderInfoAction, {
    onExecute: () => toast.loading("Enviando sua resposta..."),
    onSuccess: (data) => {
      toast.dismiss();
      if (data?.data?.success) {
        toast.success("Resposta Enviada", { description: data.data.success });
        setIsRevisaoModalOpen(false);
        fetchAllPedidos();
      } else if (data?.data?.failure) {
        toast.error("Falha ao Enviar", { description: data.data.failure });
      }
    },
    onError: ({ error }) => {
      toast.dismiss();
      const message = error.serverError || "Ocorreu um erro desconhecido.";
      toast.error("Erro ao Enviar", { description: message });
    }
  });

  const fetchAllPedidos = async () => {
    if (!profile?.id) {
      setLoadingPedidos(false);
      return;
    }
    setLoadingPedidos(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id, id_pedido_serial, created_at, texto_roteiro, titulo, creditos_debitados, status,
        audio_final_url, downloaded_at, cliente_notificado_em, tipo_audio, estilo_locucao,
        orientacoes, admin_cancel_reason, admin_message, cliente_resposta_info, 
        data_resposta_cliente, cliente_audio_resposta_url,
        locutores ( nome ),
        solicitacoes_revisao ( id, status_revisao, admin_feedback )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      setErrorLoadingPedidos(error.message);
    } else {
      const mappedPedidos = (data || []).map((item: any) => ({
        ...item,
        locutores: Array.isArray(item.locutores) ? item.locutores[0] : item.locutores,
      }));
      setPedidos(mappedPedidos as Pedido[]);
    }
    setLoadingPedidos(false);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchAllPedidos();
    }
  }, [profile?.id]);
  
  const handleOpenRevisaoModal = async (pedido: Pedido, modoResposta = false) => {
    setPedidoParaRevisao(pedido);
    setDescricaoRevisao("");
    setIsModoResposta(modoResposta);
    setAudioGuiaRevisaoFile(null);
    setMensagemAdminParaExibir(null); // Limpa o estado anterior

    if (modoResposta) {
      // CENÁRIO 1: A pendência vem de uma SOLICITAÇÃO DE REVISÃO
      const revisaoPendente = pedido.solicitacoes_revisao?.find(
        (r) => r.status_revisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE
      );

      if (revisaoPendente) {
        setMensagemAdminParaExibir(revisaoPendente.admin_feedback || "O admin solicitou mais informações sobre a revisão, mas a mensagem não foi encontrada.");
        setSolicitacaoParaResponderId(revisaoPendente.id);
        setIsRevisaoModalOpen(true);
        return; // Encerra aqui para não cair no próximo `if`
      }

      // CENÁRIO 2: A pendência vem do PEDIDO ORIGINAL
      if (pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && pedido.admin_message) {
        setMensagemAdminParaExibir(pedido.admin_message);
        setSolicitacaoParaResponderId('admin_message_response'); // Identificador especial
        setIsRevisaoModalOpen(true);
        return;
      }
      
      // Se chegou aqui, não há pendência válida para responder
      toast.error("Nenhuma pendência encontrada", { description: "Não há solicitações de informação ativas para este pedido." });

    } else {
      // Abre o modal para uma NOVA solicitação de revisão
      setSolicitacaoParaResponderId(null);
      setIsRevisaoModalOpen(true);
    }
  };
  
  const handleSolicitarRevisao = async () => {
    if (!pedidoParaRevisao || !descricaoRevisao.trim()) {
      toast.error("Descrição Necessária", { description: "Por favor, descreva o que precisa ser corrigido." });
      return;
    }
    setSubmittingRevisao(true);
    let uploadedAudioGuiaRevisaoUrl: string | null = null;
    try {
      if (audioGuiaRevisaoFile) {
        setIsUploadingGuiaRevisao(true);
        const uploadFormData = new FormData();
        uploadFormData.append('audioGuia', audioGuiaRevisaoFile);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/upload-guia-revisao`, {
          method: 'POST',
          body: uploadFormData,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
          throw new Error(errorData.message);
        }
        const result = await response.json();
        if (result.success && result.filePath) {
          uploadedAudioGuiaRevisaoUrl = result.filePath;
        } else {
          throw new Error(result.message || "Servidor não retornou o caminho do arquivo.");
        }
      }
      const resultado = await solicitarRevisaoAction({
        pedidoId: pedidoParaRevisao.id,
        descricao: descricaoRevisao.trim(),
        audioGuiaRevisaoUrl: uploadedAudioGuiaRevisaoUrl,
      });

      if (resultado?.data?.success) {
        setPedidos(prev => prev.map(p => p.id === resultado.data.pedidoId ? { ...p, status: resultado.data.novoStatus as TipoStatusPedido } : p));
        toast.success("Revisão Solicitada");
        setIsRevisaoModalOpen(false);
      } else {
        toast.error("Erro na Solicitação", { description: resultado?.serverError || "Ocorreu um erro." });
      }
    } catch (error: any) {
      toast.error("Erro na Solicitação", { description: error.message || "Ocorreu um erro inesperado." });
    } finally {
      setSubmittingRevisao(false);
      setIsUploadingGuiaRevisao(false);
    }
  };

  const handleAcaoPrincipalModalRevisao = () => {
    if (isModoResposta) {
      if (!solicitacaoParaResponderId) {
        toast.error("Erro", { description: "ID da solicitação não encontrado." });
        return;
      }

      // Verificar se é resposta a mensagem do admin (via admin_message)
      if (solicitacaoParaResponderId === 'admin_message_response' && pedidoParaRevisao) {
        handleResponderMensagemAdmin();
        return;
      }

      // Fluxo normal de resposta a solicitação de revisão
      executarEnviarResposta({
        solicitacaoId: solicitacaoParaResponderId,
        respostaCliente: descricaoRevisao,
      });
    } else {
      handleSolicitarRevisao();
    }
  };

  const handleResponderMensagemAdmin = async () => {
    if (!pedidoParaRevisao || !descricaoRevisao.trim()) {
      toast.error("Resposta Obrigatória", { description: "Por favor, forneça as informações solicitadas pelo admin." });
      return;
    }

    setSubmittingRevisao(true);
    let uploadedAudioRespostaUrl: string | null = null;

    try {
      // 1. Fazer upload do arquivo de áudio se houver
      if (audioGuiaRevisaoFile) {
        setIsUploadingGuiaRevisao(true);
        const uploadFormData = new FormData();
        uploadFormData.append('audioGuia', audioGuiaRevisaoFile);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/upload-guia-revisao`, {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido no upload.' }));
          throw new Error(errorData.message);
        }
        
        const result = await response.json();
        if (result.success && result.filePath) {
          uploadedAudioRespostaUrl = result.filePath;
          console.log("Áudio de resposta enviado com sucesso:", uploadedAudioRespostaUrl);
        } else {
          throw new Error(result.message || "Servidor não retornou o caminho do arquivo.");
        }
      }

      // 2. Atualizar o pedido com a resposta do cliente e mudar status para "em_analise"
      const updateData: any = {
        cliente_resposta_info: descricaoRevisao.trim(),
        status: PEDIDO_STATUS.EM_ANALISE,
        data_resposta_cliente: new Date().toISOString()
      };

      // Adicionar URL do áudio se foi feito upload
      if (uploadedAudioRespostaUrl) {
        updateData.cliente_audio_resposta_url = uploadedAudioRespostaUrl;
      }

      const { error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', pedidoParaRevisao.id);

      if (error) {
        console.error("Erro ao salvar resposta do cliente:", error);
        toast.error("Erro", { description: "Não foi possível salvar sua resposta." });
        return;
      }

      // 3. Atualizar o estado local
      setPedidos(prev => prev.map(p => 
        p.id === pedidoParaRevisao.id 
          ? { ...p, status: PEDIDO_STATUS.EM_ANALISE as TipoStatusPedido }
          : p
      ));

      const successMessage = uploadedAudioRespostaUrl 
        ? "Sua resposta e arquivo de áudio foram enviados com sucesso!"
        : "Sua resposta foi enviada com sucesso!";
      
      toast.success("Resposta Enviada", { description: successMessage });
      setIsRevisaoModalOpen(false);

    } catch (error: any) {
      console.error("Erro ao responder mensagem do admin:", error);
      toast.error("Erro", { description: error.message || "Ocorreu um erro inesperado ao enviar sua resposta." });
    } finally {
      setSubmittingRevisao(false);
      setIsUploadingGuiaRevisao(false);
    }
  };

  const handleDownloadOriginal = async (pedido: Pedido) => {
    if (!pedido.audio_final_url) {
      toast.error("Download Indisponível", { description: "O áudio para este pedido ainda não está pronto ou não foi encontrado." });
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = pedido.audio_final_url;
      const fileName = pedido.audio_final_url.substring(pedido.audio_final_url.lastIndexOf('/') + 1) || 'audio_pedido_' + pedido.id; // Corrigido para pedido.id
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download Iniciado", { description: "O áudio está sendo baixado." });
      if (!pedido.downloaded_at) {
        const { error } = await supabase
          .from('pedidos')
          .update({ downloaded_at: new Date().toISOString() })
          .eq('id', pedido.id); // Corrigido para pedido.id
        if (error) {
          console.warn("Não foi possível marcar o pedido como baixado:", error);
        } else {
          setPedidos(prev => prev.map(p => p.id === pedido.id ? {...p, downloaded_at: new Date().toISOString()} : p)); // Corrigido para p.id === pedido.id
        }
      }
    } catch (error) {
      console.error("Erro ao tentar baixar o áudio:", error);
      toast.error("Erro no Download", { description: "Não foi possível iniciar o download do áudio." });
    }
  };

  const handleAbrirModalDetalhesOuBaixar = (pedido: Pedido) => {
    console.log('DEBUG pedidoDisplay:', pedido);
    if (pedido.solicitacoes_revisao_count && pedido.solicitacoes_revisao_count > 0) {
      setPedidoParaDetalhesDownload(pedido);
      setIsDetalhesDownloadModalOpen(true);
    } else {
      if (pedido.audio_final_url) {
        handleDownloadOriginal(pedido);
      } else {
        setPedidoParaDetalhesDownload(pedido);
        setIsDetalhesDownloadModalOpen(true); 
      }
    }
  };

  const handleOpenHistoricoRevisoesModal = (pedido: Pedido) => {
    setPedidoParaHistoricoRevisoes(pedido);
    setIsHistoricoRevisoesModalOpen(true);
  };

  const handleNavigateToEdit = (pedidoId: string) => {
    navigate(`/gravar-locucao?pedidoId=${pedidoId}`);
  };

  const handleOpenConfirmarExclusaoModal = (pedido: Pedido) => {
    setPedidoParaExcluir(pedido);
    setIsConfirmarExclusaoModalOpen(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!pedidoParaExcluir) return;

    setSubmittingExclusao(true);
    try {
      const resultado = await excluirPedidoAction({ pedidoId: pedidoParaExcluir.id });

      if (!resultado) {
        console.error('Resultado inesperado (undefined) da action de exclusão.');
        toast.error("Erro Desconhecido", { description: "Falha ao comunicar com o servidor." });
        setSubmittingExclusao(false);
        return;
      }
      if (resultado?.data?.success === true && typeof resultado.data?.pedidoId === 'string') {
        toast.success("Pedido Excluído", { description: "Seu pedido foi excluído com sucesso." });
        const pedidoExcluidoId = resultado.data.pedidoId!
        setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoExcluidoId));
        setIsConfirmarExclusaoModalOpen(false);
        setPedidoParaExcluir(null);
      } else {
        if (resultado.validationErrors) {
            let errorMsg = "Erro de validação.";
            const ve = resultado.validationErrors;
            if (ve.pedidoId && Array.isArray(ve.pedidoId) && ve.pedidoId.length > 0) { errorMsg = ve.pedidoId.join(', '); }
            else if (ve._errors && Array.isArray(ve._errors) && ve._errors.length > 0) { errorMsg = ve._errors.join(', '); }
            toast.error("Erro de Validação", { description: errorMsg });
        } else if (resultado.serverError) {
            toast.error("Erro no Servidor", { description: resultado.serverError });
        } else if (resultado.data?.failure) {
            toast.error("Falha na Exclusão", { description: resultado.data.failure });
        } else {
            console.error('Estrutura de resultado inesperada da action de exclusão:', resultado);
            toast.error("Erro Desconhecido", { description: "Ocorreu um erro ao processar sua solicitação de exclusão." });
        }
      }
    } catch (error) {
      console.error('Erro ao excluir pedido (catch geral):', error);
      toast.error("Erro na Exclusão", { description: "Ocorreu um erro inesperado ao tentar excluir o pedido." });
    } finally {
      setSubmittingExclusao(false);
    }
  };

  if (loadingPedidos) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando seus áudios...</p>
      </div>
    );
  }

  if (errorLoadingPedidos) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Erro ao Carregar Áudios</h2>
        <p className="text-muted-foreground mb-4">{errorLoadingPedidos}</p>
        <Button onClick={fetchAllPedidos} variant="outline">
          <Loader2 className={`mr-2 h-4 w-4 ${loadingPedidos ? 'animate-spin' : 'hidden'}`} />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Áudios</h1>
          <p className="text-muted-foreground">Acompanhe o status e baixe todos os seus pedidos de áudio.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchAllPedidos()} variant="outline" size="icon" disabled={loadingPedidos} aria-label="Atualizar lista de áudios">
            <RefreshCw className={cn("h-4 w-4", loadingPedidos && "animate-spin")} />
          </Button>
          <Button onClick={() => navigate('/gravar-locucao')} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" /> Fazer Novo Pedido
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 rounded-lg shadow-sm bg-card">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Filtrar Pedidos</h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Filtro de Status */}
          <div className="flex-1 min-w-[180px] md:min-w-[200px]">
            <Label htmlFor="filtro-status-pedido" className="mb-1 block text-sm font-medium text-gray-700">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger id="filtro-status-pedido">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="gravando">Gravando</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="em_revisao">Em Revisão</SelectItem>
                <SelectItem value="aguardando_cliente">Info Solicitada</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Filtro Data Início */}
          <div className="flex-1 min-w-[160px]">
            <Label htmlFor="filtro-data-inicio" className="mb-1 block text-sm font-medium text-gray-700">Data Início</Label>
            <DatePickerSingle
              date={dataInicio}
              onDateChange={setDataInicio}
              placeholder="Data inicial"
              id="filtro-data-inicio"
            />
          </div>
          {/* Filtro Data Fim */}
          <div className="flex-1 min-w-[160px]">
            <Label htmlFor="filtro-data-fim" className="mb-1 block text-sm font-medium text-gray-700">Data Fim</Label>
            <DatePickerSingle
              date={dataFim}
              onDateChange={setDataFim}
              placeholder="Data final"
              id="filtro-data-fim"
            />
          </div>
          {/* Filtro por Título */}
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filtro-titulo" className="mb-1 block text-sm font-medium text-gray-700">Buscar por Título</Label>
            <Input
              id="filtro-titulo"
              type="text"
              placeholder="Digite parte do título..."
              value={filtroTitulo}
              onChange={(e) => setFiltroTitulo(e.target.value)}
              autoComplete="off"
              className=""
            />
          </div>
          {/* Botão Limpar Filtros */}
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => {
              setFiltroTitulo("");
              setFiltroStatus("__all__");
              setDataInicio(undefined);
              setDataFim(undefined);
              fetchAllPedidos();
            }} className="w-full md:w-auto whitespace-nowrap">Limpar Filtros</Button>
          </div>
        </div>
      </div>

      {pedidos.length === 0 ? (
        filtroTitulo.trim() ? (
          <Card className="shadow-sm bg-card text-card-foreground">
            <CardContent className="text-center py-16">
              <h3 className="text-2xl font-semibold text-foreground mb-2">Não existem pedidos com este título</h3>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm bg-card text-card-foreground m-0 border-none">
            <CardContent className="text-center py-16 px-0">
              <ListMusic className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-2">Nenhum Pedido Ainda</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Você ainda não fez nenhum pedido de áudio. Clique no botão abaixo para começar a criar seus áudios!
              </p>
              <Button onClick={() => navigate('/gravar-locucao')} size="lg" className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar meu Primeiro Áudio
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="overflow-x-auto relative rounded-lg shadow-md bg-card overflow-hidden border-none">
          <Table>
            <TableCaption className="py-4 text-sm text-muted-foreground">
              Seu histórico completo de pedidos de áudio. 
              {pedidos.length > 10 && `Exibindo ${pedidos.length} pedidos.`}
            </TableCaption>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Nº Pedido</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Data</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Locutor</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[250px]">Título do Pedido</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Créditos</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card dark:bg-neutral-900">
              {pedidos.map((pedido, idx) => {
                const isPendente = pedido.status === PEDIDO_STATUS.PENDENTE;
                const isConcluido = pedido.status === PEDIDO_STATUS.CONCLUIDO;
                const isEmRevisaoComAudio = pedido.status === PEDIDO_STATUS.EM_REVISAO && pedido.audio_final_url;

                const precisaDeResposta = 
                  (pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && pedido.admin_message) ||
                  (pedido.solicitacoes_revisao && pedido.solicitacoes_revisao.some(r => r.status_revisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE));

                return (
                  <React.Fragment key={pedido.id}>
                    <TableRow className={cn(
                      "hover:bg-muted/10 odd:bg-card even:bg-muted/5 dark:odd:bg-card dark:even:bg-muted/10 transition-colors",
                      idx === pedidos.length - 1 ? "border-0" : undefined,
                      precisaDeResposta && "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500"
                    )}>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {pedido.id_pedido_serial}
                          {precisaDeResposta && (
                            <Badge variant="outline" className="bg-amber-500 text-white border-amber-500 text-xs animate-pulse">
                              <MessageSquareWarning className="h-3 w-3 mr-1" />
                              Nova
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium whitespace-nowrap text-sm text-foreground">
                        {pedido.locutores?.nome || <span className="text-muted-foreground italic">N/A</span>}
                      </TableCell>
                      <TableCell className="px-6 py-3 text-sm text-muted-foreground max-w-xs">
                        <div>
                          <p title={pedido.titulo || 'Título não disponível'} className="truncate">
                            {pedido.titulo || <span className="italic">Título não disponível</span>}
                          </p>
                          {precisaDeResposta && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center">
                              <MessageSquareWarning className="h-3 w-3 mr-1" />
                              Mensagem do admin aguardando resposta
                            </p>
                          )}
                        </div>
                      </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium">
                      {pedido.tipo_audio ? (
                        <span className={cn(
                          pedido.tipo_audio.toUpperCase() === 'PROD' ? "text-amber-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {pedido.tipo_audio.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">N/D</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge
                        variant={
                          pedido.status === PEDIDO_STATUS.CONCLUIDO ? 'default' :
                          pedido.status === PEDIDO_STATUS.PENDENTE ? 'secondary' :
                          pedido.status === PEDIDO_STATUS.CANCELADO ? 'destructive' :
                          pedido.status === PEDIDO_STATUS.EM_PRODUCAO ? 'outline' :
                          pedido.status === PEDIDO_STATUS.EM_ANALISE ? 'outline' :
                          pedido.status === PEDIDO_STATUS.GRAVANDO ? 'outline' :
                          pedido.status === PEDIDO_STATUS.EM_REVISAO ? 'outline' :
                          pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE ? 'outline' :
                          'outline'
                        }
                        className={cn(
                          "capitalize text-xs px-2 py-0.5",
                          pedido.status === PEDIDO_STATUS.CONCLUIDO && "bg-green-500 hover:bg-green-600 text-white",
                          pedido.status === PEDIDO_STATUS.PENDENTE && "bg-amber-500 dark:bg-blue-700 hover:bg-amber-600 dark:hover:bg-blue-600 text-white dark:text-blue-100",
                          pedido.status === PEDIDO_STATUS.EM_PRODUCAO && "border-purple-500 dark:border-purple-400 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200",
                          pedido.status === PEDIDO_STATUS.EM_ANALISE && "border-amber-500 bg-amber-100 text-amber-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300",
                          pedido.status === PEDIDO_STATUS.GRAVANDO && "border-purple-500 bg-purple-100 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300",
                          pedido.status === PEDIDO_STATUS.EM_REVISAO && "border-pink-500 bg-pink-100 text-pink-700 dark:border-pink-400 dark:bg-pink-900/30 dark:text-pink-300",
                          pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && "bg-amber-500 text-white hover:bg-amber-600 dark:bg-yellow-500 dark:text-yellow-900",
                          (pedido.status === PEDIDO_STATUS.CANCELADO || pedido.status === PEDIDO_STATUS.ESTORNADO) && "bg-red-600 hover:bg-red-700"
                        )}
                      >
                        {pedido.status === PEDIDO_STATUS.ESTORNADO ? "Cancelado" 
                          : pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE 
                          ? "Info Solicitada" 
                          : pedido.status === PEDIDO_STATUS.EM_PRODUCAO
                            ? "Em Produção"
                            : pedido.status ? pedido.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Status Desconhecido"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-foreground">
                      {pedido.creditos_debitados}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        {isPendente && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Mais ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleNavigateToEdit(pedido.id)}>
                                <Edit3 className="mr-2 h-4 w-4" />
                                Editar Pedido
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenConfirmarExclusaoModal(pedido)} className="text-red-600 hover:!text-red-600 focus:!text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Pedido
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenHistoricoRevisoesModal(pedido)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {precisaDeResposta && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenRevisaoModal(pedido, true)}
                            className="bg-amber-500 hover:bg-amber-600 text-white flex items-center animate-pulse"
                          >
                            <MessageSquareWarning className="mr-2 h-4 w-4" />
                            Responder
                          </Button>
                        )}

                        {isConcluido && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAbrirModalDetalhesOuBaixar(pedido)}
                              className={cn(
                                "flex items-center",
                                "bg-status-green text-primary-foreground hover:bg-green-600 dark:bg-status-green dark:hover:bg-green-600",
                                !pedido.audio_final_url && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!pedido.audio_final_url}
                            >
                              <DownloadCloud className="mr-2 h-4 w-4" />
                              {pedido.solicitacoes_revisao_count && pedido.solicitacoes_revisao_count > 0 ? "Ver Detalhes/Baixar" : "Baixar"}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Mais ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenHistoricoRevisoesModal(pedido)}>
                                  <History className="mr-2 h-4 w-4" />
                                  Ver Detalhes e Histórico
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenRevisaoModal(pedido, false)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Solicitar Revisão
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}

                        {isEmRevisaoComAudio && (
                          <>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="opacity-70" 
                              onClick={() => handleAbrirModalDetalhesOuBaixar(pedido)}
                              aria-label="Baixar áudio original (atualmente em revisão)"
                              title="Baixar áudio original (atualmente em revisão)"
                            >
                              <DownloadCloud className="mr-1.5 h-4 w-4" /> Original
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHistoricoRevisoesModal(pedido)}
                              className="flex items-center"
                              title="Ver detalhes e histórico de revisões deste pedido"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detalhes
                            </Button>
                          </>
                        )}
                        
                        {pedido.status === PEDIDO_STATUS.CANCELADO && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAbrirModalDetalhesOuBaixar(pedido)}
                            className="flex items-center"
                            title="Ver detalhes do pedido cancelado"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isRevisaoModalOpen} onOpenChange={setIsRevisaoModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isModoResposta ? "Responder Solicitação do Admin" : "Solicitar Revisão do Áudio"}
            </DialogTitle>
            <DialogDescription>
              Pedido: #{pedidoParaRevisao?.id_pedido_serial}
              {pedidoParaRevisao?.titulo && ` - ${pedidoParaRevisao.titulo}`}
            </DialogDescription>
          </DialogHeader>
          
          {isModoResposta && mensagemAdminParaExibir && (
            <div className="my-4 p-4 border-l-4 border-amber-500 bg-amber-900/20 rounded-r-lg">
              <div className="flex items-center mb-2">
                <MessageSquareWarning className="h-5 w-5 text-amber-400 mr-2" />
                <Label className="font-semibold text-amber-300">Mensagem do Admin:</Label>
              </div>
              <div className="p-3 bg-amber-950/30 rounded text-sm border border-amber-800 whitespace-pre-wrap">
                {mensagemAdminParaExibir}
              </div>
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Por favor, leia com atenção e forneça as informações solicitadas.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="descricao-resposta" className="text-white font-medium">
              {isModoResposta ? "Sua Resposta" : "Descrição da Revisão"} <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="descricao-resposta"
              placeholder={
                isModoResposta 
                  ? "Descreva as informações solicitadas pelo admin..." 
                  : "Descreva o que precisa ser corrigido..."
              }
              value={descricaoRevisao}
              onChange={(e) => setDescricaoRevisao(e.target.value)}
              rows={4}
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400"
            />
            <p className="text-xs text-neutral-400">
              {isModoResposta 
                ? "Forneça todas as informações que o admin solicitou." 
                : "Mínimo de 10 caracteres."}
            </p>
          </div>
          <div className="my-1">
            <Label htmlFor="audio-guia-revisao-dropzone" className="text-white font-medium mb-2 block">
              Áudio Guia para Revisão <span className="text-neutral-300 font-normal">(Opcional)</span>
            </Label>
            <div
              {...getRootPropsGuiaRevisao()}
              className={cn(
                "flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                isDragActiveGuiaRevisao ? "border-blue-500 bg-neutral-800" : "border-neutral-700 bg-neutral-900",
                audioGuiaRevisaoFile ? "border-green-500 bg-green-500/5" : "",
                "hover:bg-neutral-800 text-white"
              )}
            >
              <input {...getInputPropsGuiaRevisao()} id="audio-guia-revisao-dropzone" />
              {audioGuiaRevisaoFile ? (
                <div className="text-center">
                  <FileAudio className="mx-auto h-10 w-10 text-green-600 mb-2" />
                  <p className="font-medium text-sm text-white">{audioGuiaRevisaoFile.name}</p>
                  <p className="text-xs text-neutral-300">{(audioGuiaRevisaoFile.size / 1024).toFixed(1)} KB</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive hover:bg-destructive/10"
                    onClick={e => { e.stopPropagation(); setAudioGuiaRevisaoFile(null); }}
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Remover
                  </Button>
                </div>
              ) : isDragActiveGuiaRevisao ? (
                <div className="text-center text-blue-400">
                  <FileAudio className="mx-auto h-10 w-10 mb-2 animate-bounce" />
                  <p className="font-medium">Solte o arquivo aqui...</p>
                </div>
              ) : (
                <div className="text-center text-neutral-400">
                  <FileAudio className="mx-auto h-10 w-10 mb-2" />
                  <p className="font-medium">Arraste e solte um arquivo de áudio ou clique para selecionar</p>
                  <p className="text-xs">Formatos aceitos: mp3, wav, ogg, etc.</p>
                </div>
              )}
            </div>
            {isUploadingGuiaRevisao && <p className="text-sm text-blue-400 mt-2 animate-pulse">Enviando áudio guia...</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevisaoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAcaoPrincipalModalRevisao}
              disabled={submittingRevisao || statusEnvioResposta === 'executing' || descricaoRevisao.trim().length < 10}
            >
              {isModoResposta ? <Send className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {isModoResposta ? "Enviar Resposta" : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DetalhesPedidoDownloadDialog
        isOpen={isDetalhesDownloadModalOpen}
        onOpenChange={setIsDetalhesDownloadModalOpen}
        pedido={pedidoParaDetalhesDownload}
      />

      {isHistoricoRevisoesModalOpen && (
        <HistoricoRevisoesDialog 
          isOpen={isHistoricoRevisoesModalOpen}
          onOpenChange={(isOpen) => setIsHistoricoRevisoesModalOpen(isOpen)}
          pedido={pedidoParaHistoricoRevisoes}
        />
      )}

      <Dialog open={isConfirmarExclusaoModalOpen} onOpenChange={(isOpen) => setIsConfirmarExclusaoModalOpen(isOpen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão do Pedido</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir o pedido 
              <span className="font-semibold"> #{pedidoParaExcluir?.id_pedido_serial}</span>
              {pedidoParaExcluir?.titulo && ` (${pedidoParaExcluir.titulo})`}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => {setIsConfirmarExclusaoModalOpen(false); setPedidoParaExcluir(null);}}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={submittingExclusao}
            >
              {submittingExclusao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default MeusAudiosPage; 