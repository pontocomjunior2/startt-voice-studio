import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar caminho se necessário
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Card pode ser útil para a mensagem de "nenhum pedido"
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient'; // Ajustar caminho se necessário
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loader2, ListMusic, PlusCircle, DownloadCloud, AlertTriangle, RefreshCw, Edit3, History, Eye, MoreVertical, Trash2, MessageSquare } from 'lucide-react'; // Ícones necessários, Edit3 ou History para revisão, Adicionado Trash2 e MessageSquare
import { useNavigate, Link } from 'react-router-dom'; // Link para o botão de novo pedido
import { solicitarRevisaoAction, excluirPedidoAction } from '@/actions/pedido-actions'; // Importar a action
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Para o botão de fechar/cancelar
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send } from "lucide-react"
import { PEDIDO_STATUS } from '@/types/pedido.type'; // Manter PEDIDO_STATUS aqui
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type'; // Garantir que esta importação esteja correta
import type { Pedido, TipoStatusPedido } from '@/types/pedido.type'; // Importar tipos com type

// Importações para o histórico de revisões
import { useFetchRevisoesParaCliente } from '@/hooks/cliente/use-fetch-revisoes-para-cliente.hook';
import type { SolicitacaoRevisaoParaCliente, VersaoAudioRevisadoCliente } from '@/types/revisao.type';

// Importar o novo Dialog
import { DetalhesPedidoDownloadDialog } from '@/components/cliente/detalhes-pedido-download-dialog'; // Ajuste o caminho se necessário
import { ResponderInfoModal } from '@/components/cliente/responder-info-modal'; // <<< ADICIONAR IMPORT
import { clienteResponderInfoAction } from '@/actions/cliente-actions'; // <<< IMPORTAR A NOVA ACTION
import { useAction } from 'next-safe-action/hooks'; // <<< Corrigir import para useAction e remover ActionError
import type { clienteResponderInfoSchema } from '@/actions/cliente-actions'; // Para tipar o resultado
import { z } from 'zod'; // Para inferir o tipo do schema

// Componente para o Dialog de Histórico de Revisões
interface HistoricoRevisoesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pedido: Pedido | null;
}

const HistoricoRevisoesDialog: React.FC<HistoricoRevisoesDialogProps> = ({ isOpen, onOpenChange, pedido }) => {
  const { 
    data: historicoRevisoes, 
    isLoading: isLoadingHistorico, 
    error: errorHistorico,
    refetch: refetchHistorico // Para um possível botão de atualizar dentro do modal
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de Revisões do Pedido</DialogTitle>
          <DialogDescription>
            Pedido: #{pedido.id_pedido_serial} - {pedido.titulo || "Sem título"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 py-4">
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

          {historicoRevisoes && historicoRevisoes.length > 0 && (
            <ul className="space-y-6">
              {historicoRevisoes.map((solicitacao) => (
                <li key={solicitacao.id} className="border border-border p-4 rounded-lg shadow-sm bg-card">
                  <h4 className="text-lg font-semibold text-foreground mb-1">
                    Solicitação de Revisão (#{solicitacao.id.substring(0, 8)})
                  </h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    Solicitado em: {formatarDataHora(solicitacao.dataSolicitacao)}
                  </p>
                  {solicitacao.dataConclusaoRevisao && (
                     <p className="text-sm text-muted-foreground mb-2">
                      Concluída em: {formatarDataHora(solicitacao.dataConclusaoRevisao)}
                    </p>
                  )}
                  
                  <div className="mt-2 mb-3 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium text-foreground mb-1">Sua solicitação:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {solicitacao.descricaoCliente || <span className="italic">Não especificado</span>}
                    </p>
                  </div>

                  {solicitacao.adminFeedback && (
                    <div className="mt-2 mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Feedback do Administrador (para esta solicitação):</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                        {solicitacao.adminFeedback}
                      </p>
                    </div>
                  )}
                  
                  {solicitacao.versoesAudio && solicitacao.versoesAudio.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-md font-semibold text-foreground mb-2">Áudios Revisados Entregues:</h5>
                      <ul className="space-y-3">
                        {solicitacao.versoesAudio.map((versao) => (
                          <li key={versao.id} className="border-t border-border pt-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">Versão {versao.numeroVersao}</p>
                                <p className="text-xs text-muted-foreground">Enviada em: {formatarDataHora(versao.enviadoEm)}</p>
                              </div>
                              <Button 
                                asChild 
                                size="sm" 
                                className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 sm:mt-0"
                              >
                                <a 
                                  href={versao.audioUrl} 
                                  download 
                                  // O nome do arquivo poderia ser mais elaborado se tivéssemos mais infos
                                  // title={`Baixar Versão ${versao.numeroVersao} do pedido ${pedido.id_pedido_serial}`}
                                >
                                  <DownloadCloud className="mr-2 h-4 w-4" />
                                  Baixar Versão {versao.numeroVersao}
                                </a>
                              </Button>
                            </div>
                            {versao.comentariosAdmin && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-md">
                                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Comentários do Admin (para esta versão):</p>
                                <p className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">
                                  {versao.comentariosAdmin}
                                </p>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function MeusAudiosPage() {
  const { user, profile, refreshNotifications } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [errorLoadingPedidos, setErrorLoadingPedidos] = useState<string | null>(null);
  const [loadingRevisao, setLoadingRevisao] = useState<string | null>(null); // Para feedback no botão de revisão

  // Estados para o modal de revisão
  const [isRevisaoModalOpen, setIsRevisaoModalOpen] = useState(false);
  const [pedidoParaRevisao, setPedidoParaRevisao] = useState<Pedido | null>(null);
  const [descricaoRevisao, setDescricaoRevisao] = useState("");
  const [submittingRevisao, setSubmittingRevisao] = useState(false); // Similar ao loadingRevisao, mas para o submit do modal

  // Estados para o modal de HISTÓRICO de revisões
  const [isHistoricoRevisoesModalOpen, setIsHistoricoRevisoesModalOpen] = useState(false);
  const [pedidoParaHistoricoRevisoes, setPedidoParaHistoricoRevisoes] = useState<Pedido | null>(null);

  // NOVOS ESTADOS para o modal de Detalhes e Download
  const [isDetalhesDownloadModalOpen, setIsDetalhesDownloadModalOpen] = useState(false);
  const [pedidoParaDetalhesDownload, setPedidoParaDetalhesDownload] = useState<Pedido | null>(null);

  // Estados para o modal de CONFIRMAÇÃO DE EXCLUSÃO
  const [isConfirmarExclusaoModalOpen, setIsConfirmarExclusaoModalOpen] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null);
  const [submittingExclusao, setSubmittingExclusao] = useState(false);

  // ESTADOS PARA RESPONDER INFO SOLICITADA PELO ADMIN
  const [isResponderInfoModalOpen, setIsResponderInfoModalOpen] = useState(false);
  const [pedidoParaResponderInfo, setPedidoParaResponderInfo] = useState<Pedido | null>(null);
  const [solicitacaoParaResponderInfo, setSolicitacaoParaResponderInfo] = useState<{ id: string; adminFeedback: string; } | null>(null);
  const [textoRespostaCliente, setTextoRespostaCliente] = useState("");
  const [submittingRespostaCliente, setSubmittingRespostaCliente] = useState(false);
  const [loadingAdminRequestDetails, setLoadingAdminRequestDetails] = useState(false);

  const { 
    execute: executarEnviarResposta, 
    status: statusEnvioResposta, 
    result: resultadoEnvioResposta, 
    reset: resetEnvioResposta 
  } = useAction(clienteResponderInfoAction, {
    onExecute: () => {
      setSubmittingRespostaCliente(true);
      console.log("[MeusAudiosPage] clienteResponderInfoAction: onExecute - Iniciando envio...");
    },
    onSuccess: (data: Awaited<ReturnType<typeof clienteResponderInfoAction>>) => {
      console.log("[MeusAudiosPage] clienteResponderInfoAction: onSuccess - Dados recebidos:", JSON.stringify(data, null, 2));
      if (data?.data?.success) { 
        toast.success("Resposta Enviada", { description: data.data.success });
        setIsResponderInfoModalOpen(false); 
      } else if (data?.data?.failure) {
        toast.error("Falha ao Enviar", { description: data.data.failure });
      } else {
        console.warn("[MeusAudiosPage] clienteResponderInfoAction: onSuccess - Estrutura de dados inesperada:", data);
        toast.error("Erro Inesperado", { description: "A resposta do servidor não teve o formato esperado." });
      }
      setSubmittingRespostaCliente(false);
    },
    onError: (error: any) => {
      console.error("[MeusAudiosPage] clienteResponderInfoAction: onError - Erro recebido:", JSON.stringify(error, null, 2));
      let errorMsg = "Ocorreu um erro desconhecido ao enviar sua resposta.";
      if (error.serverError) {
        errorMsg = error.serverError;
      } else if (error.validationErrors) {
        const ve = error.validationErrors;
        if (ve.respostaCliente && Array.isArray(ve.respostaCliente)) errorMsg = ve.respostaCliente.join(', ');
        else if (ve.solicitacaoId && Array.isArray(ve.solicitacaoId)) errorMsg = ve.solicitacaoId.join(', ');
        else if (ve.pedidoId && Array.isArray(ve.pedidoId)) errorMsg = ve.pedidoId.join(', ');
        else errorMsg = "Erro de validação nos dados enviados.";
      }
      toast.error("Erro ao Enviar", { description: errorMsg });
      setSubmittingRespostaCliente(false);
    },
  });

  // Função para buscar todos os pedidos do cliente
  const fetchAllPedidos = async () => {
    if (!profile?.id) {
      setErrorLoadingPedidos("Perfil do usuário não encontrado para buscar pedidos.");
      setLoadingPedidos(false);
      return;
    }
    setLoadingPedidos(true);
    setErrorLoadingPedidos(null);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          id_pedido_serial,
          created_at,
          texto_roteiro,
          titulo,
          creditos_debitados,
          status,
          audio_final_url,
          downloaded_at,
          cliente_notificado_em,
          tipo_audio,
          locutores ( nome ),
          solicitacoes_revisao ( count )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro detalhado ao buscar todos os pedidos:', error);
        setErrorLoadingPedidos(error.message || "Ocorreu um erro ao buscar seus áudios.");
        throw error;
      }

      // LOG ADICIONADO PARA VER OS DADOS FRESCOS
      console.log('[fetchAllPedidos] Dados recebidos do Supabase APÓS ATUALIZAÇÃO:', data);

      const mappedPedidos: Pedido[] = (data || []).map((item: any) => ({
        ...item,
        // Supabase retorna a relação como um array, mesmo que seja uma contagem ou um objeto único de relação.
        // Se a relação for 'locutores (nome)', ele vem como item.locutores (objeto) ou item.locutores[0] (se for array)
        // Para 'solicitacoes_revisao(count)', ele vem como item.solicitacoes_revisao (array com um objeto {count: X})
        // Para 'solicitacoes_revisao(count)', ele vem como item.solicitacoes_revisao (array com um objeto {count: X})
        locutores: Array.isArray(item.locutores) ? item.locutores[0] : item.locutores,
        solicitacoes_revisao_count: (item.solicitacoes_revisao && item.solicitacoes_revisao.length > 0) ? item.solicitacoes_revisao[0].count : 0,
        // Garantir que os campos opcionais da interface Pedido estejam presentes, mesmo que como null/undefined
        // para evitar problemas de tipo se a query não os retornar para todos os pedidos.
        // Isso já deve ser tratado pela query select, mas é uma boa prática estar ciente.
      }));
      setPedidos(mappedPedidos);

      if (mappedPedidos && mappedPedidos.length > 0 && refreshNotifications) {
        const now = new Date().toISOString();
        const pedidosToMarkAsNotified = mappedPedidos
          .filter(p => p.status === 'concluido' && p.cliente_notificado_em === null)
          .map(p => p.id);

        if (pedidosToMarkAsNotified.length > 0) {
          const { error: updateError } = await supabase
            .from('pedidos')
            .update({ cliente_notificado_em: now })
            .in('id', pedidosToMarkAsNotified);
          if (updateError) {
            console.warn("MeusAudiosPage: Erro ao marcar pedidos como notificados:", updateError);
          } else {
            refreshNotifications();
          }
        }
      }

    } catch (err: any) {
      console.error('Erro no bloco try/catch ao buscar todos os pedidos:', err);
      if (!errorLoadingPedidos) {
        setErrorLoadingPedidos("Não foi possível carregar seu histórico de áudios.");
      }
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchAllPedidos();
    }
  }, [profile?.id]);

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

  // Modificada para nova lógica
  const handleAbrirModalDetalhesOuBaixar = (pedido: Pedido) => {
    if (pedido.solicitacoes_revisao_count && pedido.solicitacoes_revisao_count > 0) {
      setPedidoParaDetalhesDownload(pedido);
      setIsDetalhesDownloadModalOpen(true);
    } else {
      // Se não há revisões, executa o download direto do áudio principal (se existir)
      if (pedido.audio_final_url) {
        handleDownloadOriginal(pedido);
      } else {
        // Se não há revisões E não há áudio final, pode abrir o modal de detalhes
        // para mostrar as informações do pedido, mesmo que sem downloads.
        // Ou exibir um toast informando que não há nada para baixar.
        // Por ora, vamos abrir o modal de detalhes para consistência, ele mostrará "nenhuma revisão" e ausência de áudio original.
        setPedidoParaDetalhesDownload(pedido);
        setIsDetalhesDownloadModalOpen(true); 
        // Alternativamente, poderia ser:
        // toast.info("Informações do Pedido", { description: "Este pedido não possui áudios para download no momento." });
      }
    }
  };

  const handleOpenRevisaoModal = (pedido: Pedido) => {
    setPedidoParaRevisao(pedido);
    setDescricaoRevisao("");
    setIsRevisaoModalOpen(true);
  };

  // Função para abrir o modal de histórico de revisões
  const handleOpenHistoricoRevisoesModal = (pedido: Pedido) => {
    setPedidoParaHistoricoRevisoes(pedido);
    setIsHistoricoRevisoesModalOpen(true);
  };

  const handleNavigateToEdit = (pedidoId: string) => {
    navigate(`/gravar-locucao?pedidoId=${pedidoId}`);
    // Futuramente, a página /gravar-locucao precisará carregar os dados do pedido com este ID.
  };

  const handleOpenConfirmarExclusaoModal = (pedido: Pedido) => {
    setPedidoParaExcluir(pedido);
    setIsConfirmarExclusaoModalOpen(true);
  };

  const handleOpenResponderInfoModal = async (pedido: Pedido) => {
    setPedidoParaResponderInfo(pedido);
    setTextoRespostaCliente(""); 
    setSolicitacaoParaResponderInfo(null);
    setIsResponderInfoModalOpen(true);
    setLoadingAdminRequestDetails(true);
  
    try {
      const { data: solicitacao, error } = await supabase
        .from('solicitacoes_revisao')
        .select('id, admin_feedback') 
        .eq('pedido_id', pedido.id)
        .eq('status_revisao', REVISAO_STATUS_ADMIN.INFO_SOLICITADA_AO_CLIENTE) 
        .order('data_solicitacao', { ascending: false })
        .limit(1)
        .single();

      // ADICIONAR LOG DETALHADO DO OBJETO SOLICITACAO
      console.log("MeusAudiosPage: handleOpenResponderInfoModal - Objeto solicitacao retornado pela query:", JSON.stringify(solicitacao, null, 2));
      console.log("MeusAudiosPage: handleOpenResponderInfoModal - Erro da query:", JSON.stringify(error, null, 2));
  
      if (error && error.code !== 'PGRST116') { 
        console.error("Erro ao buscar detalhes da solicitação do admin:", error);
        toast.error("Erro ao carregar informações", { description: "Não foi possível carregar os detalhes da solicitação do administrador." });
        setIsResponderInfoModalOpen(false); 
        return;
      }
      
      if (!solicitacao || !solicitacao.admin_feedback) {
         console.warn("Nenhuma solicitação de informação ativa ou detalhes (admin_feedback) não encontrados para o pedido:", pedido.id_pedido_serial, "Valor de solicitacao.admin_feedback:", solicitacao?.admin_feedback);
         toast.info("Nenhuma pendência", { description: "Não há informações pendentes do administrador para este pedido no momento." });
         setLoadingAdminRequestDetails(false);
         setIsResponderInfoModalOpen(false);
         return;
      }
      
      setSolicitacaoParaResponderInfo({
        id: solicitacao.id, 
        adminFeedback: solicitacao.admin_feedback, 
      });
  
    } catch (e) {
      console.error("Exceção ao buscar detalhes da solicitação do admin:", e);
      toast.error("Erro Crítico", { description: "Ocorreu um erro inesperado ao carregar os dados." });
      setIsResponderInfoModalOpen(false);
    } finally {
      setLoadingAdminRequestDetails(false);
    }
  };

  const handleEnviarRespostaCliente = async () => {
    if (!solicitacaoParaResponderInfo || !textoRespostaCliente.trim() || !pedidoParaResponderInfo) {
      toast.error("Dados incompletos", { description: "Não foi possível identificar a solicitação ou a resposta está vazia." });
      return;
    }
    
    executarEnviarResposta({
      solicitacaoId: solicitacaoParaResponderInfo.id,
      respostaCliente: textoRespostaCliente.trim(),
      pedidoId: pedidoParaResponderInfo.id,
    });
  };

  const handleConfirmarExclusao = async () => {
    if (!pedidoParaExcluir) return;

    setSubmittingExclusao(true);
    try {
      const resultado = await excluirPedidoAction({ pedidoId: pedidoParaExcluir.id });

      // Embora next-safe-action deva sempre retornar um objeto, adicionamos uma checagem para o linter.
      if (!resultado) {
        console.error('Resultado inesperado (undefined) da action de exclusão.');
        toast.error("Erro Desconhecido", { description: "Falha ao comunicar com o servidor." });
        setSubmittingExclusao(false);
        return;
      }

      if (resultado.validationErrors) {
        let errorMsg = "Erro de validação.";
        const ve = resultado.validationErrors; // Alias para encurtar
        if (ve.pedidoId && Array.isArray(ve.pedidoId) && ve.pedidoId.length > 0) {
          errorMsg = ve.pedidoId.join(', ');
        } else if (ve._errors && Array.isArray(ve._errors) && ve._errors.length > 0) {
          errorMsg = ve._errors.join(', ');
        }
        toast.error("Erro de Validação", { description: errorMsg });
      } else if (resultado.serverError) {
        toast.error("Erro no Servidor", { description: resultado.serverError });
      } else if (resultado.data && typeof resultado.data.failure === 'string') {
        toast.error("Falha na Exclusão", { description: resultado.data.failure });
      } else if (resultado.data && resultado.data.success === true && typeof resultado.data.pedidoId === 'string') {
        toast.success("Pedido Excluído", { description: "Seu pedido foi excluído com sucesso." });
        const pedidoExcluidoId = resultado.data.pedidoId;
        setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedidoExcluidoId));
        setIsConfirmarExclusaoModalOpen(false);
        setPedidoParaExcluir(null);
      } else {
        console.error('Estrutura de resultado inesperada da action de exclusão:', resultado);
        toast.error("Erro Desconhecido", { description: "Ocorreu um erro ao processar sua solicitação de exclusão." });
      }
    } catch (error) {
      console.error('Erro ao excluir pedido (catch geral):', error);
      toast.error("Erro na Exclusão", { description: "Ocorreu um erro inesperado ao tentar excluir o pedido." });
    } finally {
      setSubmittingExclusao(false);
    }
  };

  const handleSolicitarRevisao = async () => {
    if (!pedidoParaRevisao || !descricaoRevisao.trim()) {
      toast.error("Descrição Necessária", { description: "Por favor, descreva o que precisa ser corrigido." });
      return;
    }
    setSubmittingRevisao(true);
    try {
      const resultado = await solicitarRevisaoAction({ 
        pedidoId: pedidoParaRevisao.id,
        descricao: descricaoRevisao.trim(),
      });

      console.log('Resultado COMPLETO da action solicitarRevisaoAction:', JSON.stringify(resultado, null, 2));

      if (resultado?.serverError) {
        console.error('Erro do servidor na action:', resultado.serverError);
        toast.error("Erro no Servidor", { description: resultado.serverError });
      } else if (resultado?.validationErrors) {
        let errorMsg = "Erro de validação:";
        if (resultado.validationErrors.descricao && Array.isArray(resultado.validationErrors.descricao) && resultado.validationErrors.descricao.length > 0) {
          errorMsg = resultado.validationErrors.descricao.join(', ');
        } else if (resultado.validationErrors._errors && Array.isArray(resultado.validationErrors._errors) && resultado.validationErrors._errors.length > 0) {
          errorMsg = resultado.validationErrors._errors.join(', ');
        }
        console.error('Erro de validação na action:', resultado.validationErrors);
        toast.error("Erro de Validação", { description: errorMsg });
      } else if (resultado?.data?.failure) {
        console.error('Falha retornada pela action:', resultado.data.failure);
        toast.error("Falha na Solicitação", { description: resultado.data.failure });
      } else if (resultado?.data && resultado.data.success && resultado.data.pedidoId && resultado.data.novoStatus) {
        // Checagem explícita de resultado.data para o linter
        const { success, pedidoId, novoStatus } = resultado.data;
        console.log('[handleSolicitarRevisao] Sucesso da action:', success);
        console.log('[handleSolicitarRevisao] Pedido ID retornado:', pedidoId);
        console.log('[handleSolicitarRevisao] Novo Status retornado:', novoStatus);

        setPedidos(prevPedidos =>
          prevPedidos.map(p =>
            p.id === pedidoId 
              ? { ...p, status: novoStatus as TipoStatusPedido } 
              : p
          )
        );
        
        toast.success("Revisão Solicitada", { description: "Sua solicitação de revisão foi enviada com sucesso." });
        setIsRevisaoModalOpen(false);
        setDescricaoRevisao("");
      } else {
        console.error('Resultado inesperado da action:', resultado);
        toast.error("Erro Desconhecido", { description: "Ocorreu um erro ao processar sua solicitação." });
      }
    } catch (error) {
      console.error('Erro ao solicitar revisão (catch geral):', error);
      toast.error("Erro na Solicitação", { description: "Ocorreu um erro inesperado." });
    } finally {
      setSubmittingRevisao(false);
      // setLoadingRevisao(null); // Comentado anteriormente
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Áudios</h1>
          <p className="text-muted-foreground">Acompanhe o status e baixe todos os seus pedidos de locução.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchAllPedidos()} variant="outline" size="icon" disabled={loadingPedidos} aria-label="Atualizar lista de áudios">
            <RefreshCw className={cn("h-4 w-4", loadingPedidos && "animate-spin")} />
          </Button>
          <Button onClick={() => navigate('/gravar-locucao')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Fazer Novo Pedido
          </Button>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="text-center py-16">
            <ListMusic className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-2">Nenhum Pedido Ainda</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Você ainda não fez nenhum pedido de locução. Clique no botão abaixo para começar a criar seus áudios!
            </p>
            <Button onClick={() => navigate('/gravar-locucao')} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Criar meu Primeiro Áudio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto relative border border-border rounded-lg shadow-md">
          <Table>
            <TableCaption className="py-4 text-sm text-muted-foreground">
              Seu histórico completo de pedidos de locução. 
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
            <TableBody className="bg-card divide-y divide-border">
              {pedidos.map((pedido) => {
                // Log para verificar o status no momento da renderização
                console.log(`[Render Tabela] Pedido ID: ${pedido.id_pedido_serial}, Status: ${pedido.status}`);
                
                const isPendente = pedido.status === PEDIDO_STATUS.PENDENTE;
                const isConcluido = pedido.status === PEDIDO_STATUS.CONCLUIDO;
                const isEmRevisaoComAudio = pedido.status === PEDIDO_STATUS.EM_REVISAO && pedido.audio_final_url;
                const podeVerDetalhesGeral = pedido.status !== PEDIDO_STATUS.PENDENTE && 
                                           pedido.status !== PEDIDO_STATUS.CANCELADO && 
                                           !isConcluido && 
                                           !isEmRevisaoComAudio;

                return (
                  <TableRow key={pedido.id} className="hover:bg-muted/10 odd:bg-card even:bg-muted/5 transition-colors">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{pedido.id_pedido_serial}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium whitespace-nowrap text-sm text-foreground">
                      {pedido.locutores?.nome || <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      <p title={pedido.titulo || 'Título não disponível'}>
                        {pedido.titulo || <span className="italic">Título não disponível</span>}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium">
                      {/* Renderizar o tipo_audio. Poderia ser um Badge se quisesse estilizar. */}
                      {pedido.tipo_audio ? (
                        <span className={cn(
                          pedido.tipo_audio.toUpperCase() === 'PROD' ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"
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
                          pedido.status === PEDIDO_STATUS.EM_PRODUCAO ? 'outline' : // Usar 'outline' como base para cor customizada
                          pedido.status === PEDIDO_STATUS.EM_ANALISE ? 'outline' :
                          pedido.status === PEDIDO_STATUS.GRAVANDO ? 'outline' :
                          pedido.status === PEDIDO_STATUS.EM_REVISAO ? 'outline' :
                          pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE ? 'outline' : // Adicionado para AGUARDANDO_CLIENTE
                          'outline'
                        }
                        className={cn(
                          "capitalize text-xs px-2 py-0.5",
                          pedido.status === PEDIDO_STATUS.CONCLUIDO && "bg-green-500 hover:bg-green-600 text-white",
                          pedido.status === PEDIDO_STATUS.PENDENTE && "bg-yellow-500 hover:bg-yellow-600 text-black",
                          pedido.status === PEDIDO_STATUS.EM_PRODUCAO && "border-orange-500 bg-orange-100 text-orange-700 dark:border-orange-400 dark:bg-orange-900/30 dark:text-orange-300",
                          pedido.status === PEDIDO_STATUS.EM_ANALISE && "border-blue-500 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300",
                          pedido.status === PEDIDO_STATUS.GRAVANDO && "border-purple-500 bg-purple-100 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300",
                          pedido.status === PEDIDO_STATUS.EM_REVISAO && "border-pink-500 bg-pink-100 text-pink-700 dark:border-pink-400 dark:bg-pink-900/30 dark:text-pink-300",
                          pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && "border-amber-500 bg-amber-100 text-amber-700 dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-300", // Estilo para Info Solicitada
                          pedido.status === PEDIDO_STATUS.CANCELADO && "bg-red-600 hover:bg-red-700" // destructive já tem cor
                        )}
                      >
                        {pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE 
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
                        {/* Ações para Pedidos PENDENTES */}
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

                        {/* Ações para Pedidos AGUARDANDO_CLIENTE */}
                        {pedido && pedido.status === PEDIDO_STATUS.AGUARDANDO_CLIENTE && (
                           <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                               <MoreVertical className="h-4 w-4" />
                               <span className="sr-only">Mais ações</span>
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleOpenResponderInfoModal(pedido)}>
                               <MessageSquare className="mr-2 h-4 w-4" />
                               Responder Informação
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => handleOpenHistoricoRevisoesModal(pedido)}>
                               <Eye className="mr-2 h-4 w-4" />
                               Ver Detalhes do Pedido
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                        )}

                        {/* Ações para Pedidos CONCLUÍDOS */}
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
                                <DropdownMenuItem onClick={() => handleOpenRevisaoModal(pedido)} disabled={loadingRevisao === pedido.id}>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Solicitar Revisão
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}

                        {/* Ações para EM_REVISAO com áudio final (original) */}
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
                        
                        {/* Botão "Ver Detalhes" para outros status (GRAVANDO, etc.) */}
                        {podeVerDetalhesGeral && (
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
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal para Solicitar Revisão */}
      <Dialog open={isRevisaoModalOpen} onOpenChange={setIsRevisaoModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Solicitar Revisão do Áudio</DialogTitle>
            <DialogDescription>
              Pedido: #{pedidoParaRevisao?.id_pedido_serial} - {pedidoParaRevisao?.titulo || "Sem título"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 items-center gap-2">
              <Label htmlFor="descricaoRevisaoTextarea" className="text-left">
                Descreva seu problema
              </Label>
              <Textarea
                id="descricaoRevisaoTextarea"
                placeholder="Descreva em detalhes o que precisa ser corrigido no áudio..."
                value={descricaoRevisao}
                onChange={(e) => setDescricaoRevisao(e.target.value)}
                rows={5}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setIsRevisaoModalOpen(false)}>Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={handleSolicitarRevisao} 
              disabled={submittingRevisao || !descricaoRevisao.trim()}
            >
              {submittingRevisao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Detalhes do Pedido e Downloads (NOVO) */}
      <DetalhesPedidoDownloadDialog
        isOpen={isDetalhesDownloadModalOpen}
        onOpenChange={setIsDetalhesDownloadModalOpen}
        pedido={pedidoParaDetalhesDownload}
      />

      {/* Modal para Histórico de Revisões (LEGADO - pode ser removido se o novo for suficiente) */}
      {isHistoricoRevisoesModalOpen && (
        <HistoricoRevisoesDialog 
          isOpen={isHistoricoRevisoesModalOpen}
          onOpenChange={setIsHistoricoRevisoesModalOpen}
          pedido={pedidoParaHistoricoRevisoes} // Note que este usa pedidoParaHistoricoRevisoes
        />
      )}

      {/* Modal para Responder Informação Solicitada */}
      <ResponderInfoModal
        isOpen={isResponderInfoModalOpen}
        onOpenChange={(isOpen) => {
          setIsResponderInfoModalOpen(isOpen);
          if (!isOpen) resetEnvioResposta(); // Resetar o estado da action ao fechar o modal
        }}
        pedido={pedidoParaResponderInfo}
        solicitacao={solicitacaoParaResponderInfo}
        textoResposta={textoRespostaCliente}
        onTextoRespostaChange={setTextoRespostaCliente}
        onSubmit={handleEnviarRespostaCliente}
        // Usar status do useAction para isSubmitting
        isSubmitting={statusEnvioResposta === 'executing'}
        isLoadingDetails={loadingAdminRequestDetails}
      />

      {/* Modal para Confirmar Exclusão de Pedido */}
      <Dialog open={isConfirmarExclusaoModalOpen} onOpenChange={setIsConfirmarExclusaoModalOpen}>
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