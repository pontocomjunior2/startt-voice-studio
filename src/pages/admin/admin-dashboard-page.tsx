import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CreditCard, ListChecks, AlertTriangle, Loader2, FileText, CalendarDays, UserCircle, Eye, UploadCloud, Save, RotateCcw, RefreshCw, MessageSquare, DownloadCloud } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

// Importações para filtros
import { type DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { supabase } from '@/lib/supabaseClient'; // Para a query direta

// Hook e tipo customizado
import { useFetchAdminDashboardStats } from '../../hooks/queries/use-fetch-admin-dashboard-stats.hook';
import type { AdminDashboardStats } from '../../hooks/queries/use-fetch-admin-dashboard-stats.hook';

// RESTAURAR IMPORTAÇÕES DE TIPO E HOOK
import type { AdminPedido, SolicitacaoRevisaoDetalhada, VersaoAudioRevisadoDetalhada } from '../../types/pedido.type';
import { useUpdatePedidoStatus } from '../../hooks/mutations/use-update-pedido-status.hook';

// REMOVER HOOK PARA SOLICITAÇÕES DE REVISÃO
// import { useFetchAdminSolicitacoesRevisao } from '../../hooks/admin/use-fetch-admin-solicitacoes-revisao.hook';
import type { SolicitacaoRevisaoAdmin, TipoRevisaoStatusAdmin } from '../../types/revisao.type';
import { REVISAO_STATUS_ADMIN } from '../../types/revisao.type';

// Novo Hook para o histórico detalhado de revisões de um pedido
import { useFetchSolicitacoesRevisaoDetalhadasPorPedido } from '../../hooks/queries/use-fetch-solicitacoes-revisao-detalhadas-por-pedido.hook';

// Action para processar revisão
import { processarRevisaoAdminAction } from '@/actions/revisao-actions';
import { useAction } from 'next-safe-action/react';

// Date-fns para formatação
import { format, endOfDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Novo hook para upload e update
import { useUploadPedidoAudio } from '../../hooks/mutations/use-upload-pedido-audio.hook';
import { useUpdatePedidoAudioAndStatus } from '../../hooks/mutations/use-update-pedido-audio-and-status.hook';

// Importar componentes de paginação do ShadCN de forma estática
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Importar Tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AdminDashboardPage() {
  const queryClient = useQueryClient();

  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    isFetching: isFetchingStats,
    isError: isFetchStatsError, 
    error: fetchStatsError 
  } = useFetchAdminDashboardStats();

  // Estados para os filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroData, setFiltroData] = useState<DateRange | undefined>(undefined);
  
  // Estados para os pedidos paginados e loading (substituindo pedidosAdmin)
  const [pedidosExibidos, setPedidosExibidos] = useState<AdminPedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  
  // Estados para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  const [totalPedidosCount, setTotalPedidosCount] = useState(0);

  console.log(
    'AdminDashboard RENDER: isFetchingStats:',
    isFetchingStats
    // isLoadingSolicitacoesRevisao removido
  );

  const [selectedPedido, setSelectedPedido] = useState<AdminPedido | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // Modal principal do pedido
  
  const [currentPedidoStatus, setCurrentPedidoStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdatingPedido, setIsUpdatingPedido] = useState(false);

  // Novos estados para a aba de revisão
  const [activeRevisao, setActiveRevisao] = useState<SolicitacaoRevisaoDetalhada | null>(null);
  const [loadingRevisao, setLoadingRevisao] = useState(false);
  const [currentRevisaoAdminFeedback, setCurrentRevisaoAdminFeedback] = useState<string>("");
  const [revisaoAudioFile, setRevisaoAudioFile] = useState<File | null>(null);
  const [selectedAdminActionStatus, setSelectedAdminActionStatus] = useState<TipoRevisaoStatusAdmin | undefined>(undefined);

  // Estado para controlar a aba ativa no modal
  const [modalActiveTab, setModalActiveTab] = useState<string>("detalhesPedido");

  const { // Este hook busca o histórico para o modal do pedido, deve ser mantido
    data: historicoRevisoesPedido,
    isLoading: isLoadingHistoricoRevisoesPedido,
    isError: isErrorHistoricoRevisoesPedido,
    error: errorHistoricoRevisoesPedido,
  } = useFetchSolicitacoesRevisaoDetalhadasPorPedido({
    pedidoId: selectedPedido?.id || null,
    enabled: isViewModalOpen && !!selectedPedido?.id, // Ativado quando o modal do pedido está aberto
  });

  const updateStatusMutation = useUpdatePedidoStatus();
  const uploadAudioMutation = useUploadPedidoAudio();
  const updateAudioAndStatusMutation = useUpdatePedidoAudioAndStatus();

  // MANTER ESTA ACTION E SEU HOOK, SERÁ USADA NO MODAL DO PEDIDO NO FUTURO
  const { 
    execute: executeProcessarRevisao, 
    status: processarRevisaoStatus,
    result: processarRevisaoResult,
    reset: resetProcessarRevisaoAction,
  } = useAction(processarRevisaoAdminAction, {
    onExecute: () => {
      console.log('[AdminDashboardPage] Executando processarRevisaoAdminAction...');
      toast.loading('Processando revisão...');
      // setIsSubmittingRevisaoAdmin(true); // Este estado será gerenciado no modal do pedido
    },
    onSuccess: (data: Awaited<ReturnType<typeof processarRevisaoAdminAction>>) => {
      toast.dismiss();
      console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - Data:', JSON.stringify(data, null, 2));

      if (data?.data?.success && typeof data.data.success === 'string') {
        toast.success(data.data.success);
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        fetchPedidosAdmin(); // Atualiza a lista de pedidos paginada
        if(selectedPedido?.id) { 
          queryClient.invalidateQueries({ queryKey: ['solicitacoesRevisaoDetalhadasPorPedido', selectedPedido.id] });
          // A activeRevisao será naturalmente recarregada se o modal for reaberto para o mesmo pedido,
          // devido ao useEffect que chama fetchActiveRevisao.
        }
        // Os estados do formulário de revisão são resetados pelo useEffect/onOpenChange do Dialog ao fechar.
        
        setIsViewModalOpen(false); // <<--- ADICIONAR ESTA LINHA PARA FECHAR O MODAL

      } else if (data?.data?.failure && typeof data.data.failure === 'string') {
        toast.error(`Falha ao processar revisão: ${data.data.failure}`);
      } else if (data?.serverError && typeof data.serverError === 'string') {
        if (data.serverError === "ACESSO_NEGADO_ADMIN") {
          toast.error("Acesso negado. Você não tem permissão para executar esta ação.");
        } else {
          toast.error(`Erro do servidor: ${data.serverError}`);
        }
      } else if (data?.validationErrors) {
        console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - ValidationErrors branch. Modal NÃO será fechado automaticamente (deveria ser pego pelo onError).');
      } else {
        toast.error('Resposta inesperada ao processar a revisão.');
      }
    },
    onError: (error: import('next-safe-action/react').HookActionError) => {
      toast.dismiss();
      console.error('[AdminDashboardPage] Erro ao processar revisão (onError):', error);
      
      let errorMessage = 'Erro desconhecido ao processar revisão.';
      if (error.serverError) {
        errorMessage = error.serverError === "ACESSO_NEGADO_ADMIN" 
          ? "Acesso negado. Você não tem permissão para executar esta ação." 
          : `Erro do servidor: ${error.serverError}`;
      } else if (error.validationErrors) {
        const fieldMapping: Record<string, string> = {
            solicitacaoId: 'ID da Solicitação',
            adminFeedback: 'Feedback do Admin',
            audioFile: 'Arquivo de Áudio',
            novoStatusRevisao: 'Ação da Revisão',
        };
        const validationMessages = Object.entries(error.validationErrors)
          .map(([field, fieldMessages]) => {
            const fieldName = fieldMapping[field] || field;
            const messagesString = Array.isArray(fieldMessages) ? fieldMessages.join(', ') : 'Erro de validação';
            return `${fieldName}: ${messagesString}`;
          })
          .join('\n');
        errorMessage = `Erro de validação:\n${validationMessages}`;
      } else if (error.fetchError) {
        errorMessage = `Erro de comunicação: ${error.fetchError}`;
      }
      toast.error(errorMessage);
    },
    onSettled: () => {
      resetProcessarRevisaoAction();
      // setIsSubmittingRevisaoAdmin(false); // Estado local do modal removido
    }
  });

  // Nova função para buscar pedidos com filtros e paginação
  const fetchPedidosAdmin = async () => {
    console.log('[AdminDashboardPage] fetchPedidosAdmin chamado com filtros:', { filtroStatus, filtroData, currentPage, itemsPerPage });
    setLoadingPedidos(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Query para contagem total com filtros
      let countQuery = supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true });

      if (filtroStatus !== 'todos') {
        countQuery = countQuery.eq('status', filtroStatus);
      }
      if (filtroData?.from) {
        countQuery = countQuery.gte('created_at', format(startOfDay(filtroData.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }
      if (filtroData?.to) {
        countQuery = countQuery.lte('created_at', format(endOfDay(filtroData.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }
      
      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('[AdminDashboardPage] Erro ao contar pedidos admin:', countError);
        toast.error('Erro ao obter contagem de pedidos.');
        // Não limpar pedidos aqui, pode haver dados da página anterior
      } else {
        setTotalPedidosCount(count || 0);
      }

      // Query principal para buscar dados paginados com filtros
      let dataQuery = supabase
        .from('pedidos')
        .select(`
          id, created_at, status, texto_roteiro, creditos_debitados, titulo,
          estilo_locucao, tipo_audio, orientacoes, id_pedido_serial,
          audio_final_url, downloaded_at, cliente_notificado_em,
          profile:profiles ( id, full_name, email, username ),
          locutores ( id, nome )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filtroStatus !== 'todos') {
        dataQuery = dataQuery.eq('status', filtroStatus);
      }
      if (filtroData?.from) {
        dataQuery = dataQuery.gte('created_at', format(startOfDay(filtroData.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }
      if (filtroData?.to) {
        dataQuery = dataQuery.lte('created_at', format(endOfDay(filtroData.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }
      
      const { data, error: dataError } = await dataQuery;

      if (dataError) {
        console.error('[AdminDashboardPage] Erro DETALHADO ao buscar pedidos admin (paginado):', JSON.stringify(dataError, null, 2));
        toast.error(`Erro ao buscar pedidos: ${dataError.message || 'Detalhes no console.'}`);
        setPedidosExibidos([]);
      } else {
        const pedidosFormatados = data.map(p => {
          const profileData = Array.isArray(p.profile) ? p.profile[0] : p.profile;
          const locutorData = Array.isArray(p.locutores) ? p.locutores[0] : p.locutores;
          
          // Mapeamento explícito para AdminPedido
          return {
            id: p.id,
            id_pedido_serial: p.id_pedido_serial,
            created_at: p.created_at,
            texto_roteiro: p.texto_roteiro,
            status: p.status,
            user_id: profileData?.id || '', // Correção crucial aqui
            profile: profileData ? {
              id: profileData.id,
              full_name: profileData.full_name,
              username: profileData.username,
              email: profileData.email,
            } : null,
            locutores: locutorData ? { nome: locutorData.nome } : null,
            audio_final_url: p.audio_final_url,
            titulo: p.titulo,
            estilo_locucao: p.estilo_locucao,
            orientacoes: p.orientacoes,
            tipo_audio: p.tipo_audio,
            // creditos_debitados e cliente_notificado_em não estão em AdminPedido, mas estão na query.
            // Se forem necessários em AdminPedido, devem ser adicionados ao tipo.
            // Por ora, não são incluídos no objeto mapeado para AdminPedido para evitar erros de tipo.
          };
        }) as AdminPedido[];
        console.log('[AdminDashboardPage] Pedidos (paginados) recebidos e formatados:', pedidosFormatados);
        setPedidosExibidos(pedidosFormatados);
      }
    } catch (e) {
      console.error('[AdminDashboardPage] Exceção ao buscar pedidos admin (paginado):', e);
      toast.error('Ocorreu uma exceção ao buscar os pedidos.');
      setPedidosExibidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // useEffect para buscar pedidos quando os filtros ou paginação mudarem
  useEffect(() => {
    fetchPedidosAdmin();
  }, [filtroStatus, filtroData, currentPage, itemsPerPage]); // Adicionado currentPage e itemsPerPage

  const handleOpenViewModal = (pedido: AdminPedido) => {
    console.log('[AdminDashboardPage] Abrindo modal para pedido (objeto completo):', pedido);
    console.log('[AdminDashboardPage] Valor de tipo_audio para o modal:', pedido.tipo_audio);
    setSelectedPedido(pedido);
    setCurrentPedidoStatus(pedido.status);
    setSelectedFile(null);
    setIsViewModalOpen(true);
    setActiveRevisao(null);
    setCurrentRevisaoAdminFeedback("");
    setSelectedAdminActionStatus(undefined);
    setRevisaoAudioFile(null);
    setModalActiveTab("detalhesPedido");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpdatePedido = async () => {
    if (!selectedPedido) return;

    const statusHasChanged = currentPedidoStatus !== selectedPedido.status;
    const fileHasBeenSelected = selectedFile !== null;

    if (!statusHasChanged && !fileHasBeenSelected) {
      setIsViewModalOpen(false);
      return;
    }

    setIsUpdatingPedido(true);

    try {
      if (fileHasBeenSelected && selectedFile) {
        const username = selectedPedido.profile?.username;
        if (!username) throw new Error('Username do cliente não encontrado.');
        const uploadResult = await uploadAudioMutation.mutateAsync({ file: selectedFile, username });
        await updateAudioAndStatusMutation.mutateAsync({
          pedidoId: selectedPedido.id,
          audioUrl: uploadResult.filePath,
          novoStatus: 'concluido',
        });
      } else if (statusHasChanged) {
        await updateStatusMutation.mutateAsync({
          pedidoId: selectedPedido.id,
          novoStatus: currentPedidoStatus,
        });
      }
      setIsViewModalOpen(false);
    } catch (error) {
      console.error('Erro em handleUpdatePedido:', error);
    } finally {
      setIsUpdatingPedido(false);
    }
  };

  const handleReopenPedido = async () => {
    if (!selectedPedido || (selectedPedido.status !== 'concluido' && selectedPedido.status !== 'cancelado')) return;

    setIsUpdatingPedido(true);

    try {
      const novoStatusParaReabertura = 'pendente';
      await updateStatusMutation.mutateAsync({
        pedidoId: selectedPedido.id,
        novoStatus: novoStatusParaReabertura,
      });
      setSelectedPedido((prev: AdminPedido | null) => prev ? { ...prev, status: novoStatusParaReabertura, audio_final_url: null } : null);
      setCurrentPedidoStatus(novoStatusParaReabertura);
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro em handleReopenPedido:', error);
    } finally {
      setIsUpdatingPedido(false);
    }
  };

  const statCardsData = [
    { 
      title: "Clientes Ativos", 
      valueKey: "activeclients",
      icon: Users,
      subtext: "Total de usuários com role 'cliente'",
      iconColorClass: "text-status-blue",
    },
    {
      title: "Créditos (Clientes)", 
      valueKey: "totalclientcredits",
      icon: CreditCard, 
      subtext: "Soma de créditos dos clientes",
      iconColorClass: "text-status-green",
    },
    { 
      title: "Pedidos Pendentes", // Este card ainda pode usar stats.pendingorders se essa métrica vier de useFetchAdminDashboardStats
      valueKey: "pendingorders",
      icon: ListChecks,
      subtext: "Pedidos aguardando gravação",
      iconColorClass: "text-status-orange",
      tagKey: "pendingorders",
      tagColorClass: "bg-status-orange text-white"
    },
  ];

  // const isLoading = isLoadingStats || loadingPedidos || isLoadingSolicitacoesRevisao; // isLoadingSolicitacoesRevisao removido
  const isLoadingGlobal = isLoadingStats || loadingPedidos;

  // const adminRevisaoStatusOptions = [ ... ]; // Removido, pois o modal específico foi removido. Será reintroduzido no modal do pedido.

  // Opções para o filtro de status, incluindo "Todos Status" e "Em Revisão"
  const PEDIDO_STATUS_OPTIONS_FILTRO = [
    { value: 'todos', label: 'Todos Status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'em_revisao', label: 'Em Revisão' },
    { value: 'gravando', label: 'Gravando' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'cancelado', label: 'Cancelado' },
    // Adicione mais status se necessário, ex: rejeitado (se houver)
  ];

  // Função para buscar a solicitação de revisão ativa
  const fetchActiveRevisao = async (pedidoId: string) => {
    if (!pedidoId) {
      setActiveRevisao(null);
      return;
    }
    setLoadingRevisao(true);
    setActiveRevisao(null); // Limpa revisão anterior ao buscar nova
    try {
      console.log(`[AdminDashboardPage] Buscando última revisão para pedido ID: ${pedidoId}`);
      const { data, error } = await supabase
        .from('solicitacoes_revisao')
        .select('*, versoes_audio_revisao(*)') // Mantido: Traz também os áudios revisados associados
        .eq('pedido_id', pedidoId)
        // Removido o filtro .not() para pegar a mais recente, independentemente do status
        // .not('status_revisao', 'in', '("concluida_pelo_admin", "negada")') 
        .order('data_solicitacao', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: single() retornou 0 linhas, o que é ok
        console.error("[AdminDashboardPage] Erro ao buscar revisão ativa:", error);
        toast.error(`Erro ao buscar detalhes da revisão: ${error.message}`);
        setActiveRevisao(null);
      } else {
        const loadedRevisao = data as SolicitacaoRevisaoDetalhada | null;
        setActiveRevisao(loadedRevisao); 
        console.log("[AdminDashboardPage] Revisão ativa carregada:", loadedRevisao);
        if (loadedRevisao) {
          // Pré-popular estados para os campos do formulário de revisão
          setCurrentRevisaoAdminFeedback(loadedRevisao.admin_feedback || "");
          // Se o status da revisão já é final (concluida ou negada), não pré-selecionar para nova ação,
          // a menos que queiramos permitir re-processar. Por ora, só pré-seleciona se não for final.
          if (loadedRevisao.status_revisao !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && loadedRevisao.status_revisao !== REVISAO_STATUS_ADMIN.NEGADA) {
            setSelectedAdminActionStatus(loadedRevisao.status_revisao as TipoRevisaoStatusAdmin);
          } else {
            setSelectedAdminActionStatus(undefined); // Limpa ação se revisão já está finalizada
          }
          setRevisaoAudioFile(null); // Limpar seleção de arquivo anterior
        } else {
          setCurrentRevisaoAdminFeedback("");
          setSelectedAdminActionStatus(undefined);
          setRevisaoAudioFile(null);
        }
      }
    } catch (err: any) {
      console.error("[AdminDashboardPage] Exceção ao buscar revisão ativa:", err);
      toast.error(`Exceção ao buscar detalhes da revisão: ${err.message}`);
      setActiveRevisao(null);
    } finally {
      setLoadingRevisao(false);
    }
  };
  
  // useEffect para buscar revisão ativa quando o modal é aberto ou o pedido selecionado muda
  useEffect(() => {
    if (isViewModalOpen && selectedPedido?.id) {
      fetchActiveRevisao(selectedPedido.id);
      setModalActiveTab("detalhesPedido"); // Resetar para a aba de detalhes ao abrir/mudar pedido
    } else {
      setActiveRevisao(null); // Limpa se o modal fechar ou não houver pedido
      setCurrentRevisaoAdminFeedback("");
      setSelectedAdminActionStatus(undefined);
      setRevisaoAudioFile(null);
    }
  }, [isViewModalOpen, selectedPedido?.id]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-foreground">Visão Geral</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log('--- Botão Atualizar Tudo CLICADO ---');
              console.log('Estados de Fetching ANTES da invalidação/refresh:');
              console.log('isFetchingStats:', isFetchingStats);
              console.log('isLoadingPedidos (antes do fetch direto):', loadingPedidos);

              console.log('Invalidando adminDashboardStats...');
              queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
              
              console.log('Chamando fetchPedidosAdmin diretamente...');
              fetchPedidosAdmin();

              console.log('--- Invalidações e Refresh Chamados ---');
            }}
            disabled={isFetchingStats || loadingPedidos}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isFetchingStats || loadingPedidos) && "animate-spin")} />
            Atualizar Tudo
          </Button>
        </div>
        <Separator className="my-4" />
        {isFetchStatsError && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            Erro ao carregar estatísticas do dashboard: {fetchStatsError?.message}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(isLoadingStats ? Array.from({ length: statCardsData.length }).map((_, i) => ({ id: i, isLoading: true })) : statCardsData).map((cardInfo: any, index) => {
            let Icon = cardInfo.isLoading ? Loader2 : cardInfo.icon;
            let value = cardInfo.isLoading ? null 
                          : cardInfo.valueKey && stats ? stats[cardInfo.valueKey as keyof AdminDashboardStats] 
                          : cardInfo.value;
            let tagText = cardInfo.isLoading ? null : (cardInfo.tagKey && stats ? stats[cardInfo.tagKey as keyof AdminDashboardStats] : cardInfo.tagText);

            // Card de Correções Pendentes - lógica ajustada
            if (cardInfo.title === "Correções Pendentes") {
              // Este card atualmente não tem uma métrica correspondente em AdminDashboardStats.
              // Exibindo 0 como placeholder.
              // TODO: Implementar a métrica 'pendingcorrecoes' ou similar na RPC get_admin_dashboard_stats e no tipo AdminDashboardStats.
              Icon = cardInfo.icon; // Usar o ícone definido no cardInfo
              value = 0; // Placeholder
              // specificLoading não é aplicável aqui se não há dados sendo carregados especificamente para este card.
            }

            return (
              <Card key={`stat-${index}`} className={`shadow-sm hover:shadow-md transition-shadow rounded-lg`}>
                {cardInfo.isLoading || (cardInfo.title === "Correções Pendentes" && isLoadingStats) ? ( // Para "Correções Pendentes", usar isLoadingStats global se for um placeholder
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <Skeleton className="h-12 w-12 rounded-full mb-3" /> 
                    <Skeleton className="h-8 w-1/2 mb-2" />      
                    <Skeleton className="h-4 w-3/4" />         
                  </CardContent>
                ) : (
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      {value !== undefined && value !== null ? value.toLocaleString('pt-BR') : (cardInfo.valueKey === undefined && !cardInfo.fixedValue && cardInfo.title !== "Correções Pendentes") ? '-' : '0'}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mt-1 text-center">
                      {cardInfo.title}
                    </p>
                    {cardInfo.subtext && (
                       <p className="text-xs text-muted-foreground text-center">
                         {cardInfo.subtext}
                       </p>
                    )}
                    {tagText !== undefined && tagText !== null && (cardInfo.tagKey || cardInfo.tagText) && (
                      <div className={`mt-2 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${cardInfo.tagColorClass ? cardInfo.tagColorClass : 'bg-muted text-muted-foreground'}`}>
                        {tagText} {cardInfo.tagKey && cardInfo.title.includes("Pedidos") ? (String(tagText) === '1' ? " Pedido" : " Pedidos") : ""}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">Lista de Pedidos</h2>
        </div>
        <Separator className="my-4" />

        {/* Seção de Filtros */}
        <div className="mb-6 p-4 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Filtrar Pedidos</h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end"> {/* Alterado para items-end para alinhar botão com inputs */}
            {/* Filtro de Status */}
            <div className="flex-1 min-w-[200px] md:min-w-[250px]">
              <Label htmlFor="filtro-status-pedido" className="mb-1 block text-sm font-medium text-gray-700">Status do Pedido</Label>
              <Select
                value={filtroStatus}
                onValueChange={setFiltroStatus}
              >
                <SelectTrigger id="filtro-status-pedido" className="w-full">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {PEDIDO_STATUS_OPTIONS_FILTRO.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Data */}
            <div className="flex-1 min-w-[280px] md:min-w-[320px]">
              <Label htmlFor="filtro-data-pedido" className="mb-1 block text-sm font-medium text-gray-700">Período</Label>
              <DatePickerWithRange
                date={filtroData}
                onDateChange={setFiltroData}
                className="w-full" // O ID é aplicado no botão dentro do DatePickerWithRange
              />
            </div>
            
            {/* Botão Limpar Filtros */}
            <Button 
              onClick={() => { 
                setFiltroStatus('todos'); 
                setFiltroData(undefined); 
              }} 
              variant="outline" 
              className="w-full md:w-auto" // Ajuste de largura para responsividade
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Tabela de Pedidos Unificada */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-blue-500" />
              Pedidos ({loadingPedidos ? '...' : totalPedidosCount}) {/* Usar totalPedidosCount */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPedidos ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-gray-600">Carregando pedidos...</p>
              </div>
            ) : pedidosExibidos.length > 0 ? ( // Usar pedidosExibidos
              <Table>
                <TableCaption>
                  {totalPedidosCount === 0 ? "Nenhum pedido encontrado com os filtros atuais." : `Exibindo ${pedidosExibidos.length} de ${totalPedidosCount} pedido(s).`}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Locutor</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-[150px]">Data</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosExibidos.map((pedido) => ( // Usar pedidosExibidos
                    <TableRow key={pedido.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{pedido.id_pedido_serial}</TableCell>
                      <TableCell>
                        <div className="font-medium">{pedido.profile?.full_name || pedido.profile?.username || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{pedido.profile?.email}</div>
                      </TableCell>
                      <TableCell>{pedido.locutores?.nome || 'Não definido'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={pedido.titulo || ''}>{pedido.titulo || 'Sem título'}</TableCell>
                      <TableCell>{format(new Date(pedido.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell>
                          {/* Lógica do Badge de Status mantida */}
                          <Badge 
                            variant={
                              pedido.status === 'pendente' ? 'default' :
                              pedido.status === 'gravando' ? 'secondary' :
                              pedido.status === 'concluido' ? 'outline' : 
                              pedido.status === 'cancelado' ? 'destructive' :
                              pedido.status === 'em_revisao' ? 'outline' : 
                              'outline'
                            }
                            className={cn(
                              "capitalize",
                              pedido.status === 'concluido' && "border-green-500 bg-green-100 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-300",
                              pedido.status === 'em_revisao' && "border-yellow-500 bg-yellow-100 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300"
                            )}
                          >
                            {PEDIDO_STATUS_OPTIONS_FILTRO.find(opt => opt.value === pedido.status)?.label || pedido.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenViewModal(pedido)}>
                          <Eye className="h-4 w-4 mr-1" /> Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Nenhum pedido encontrado.</p>
                <p className="text-xs text-gray-400">Tente ajustar os filtros ou aguarde novos pedidos.</p>
              </div>
            )}
            {/* Componentes de Paginação */} 
            {totalPedidosCount > 0 && (
              <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {pedidosExibidos.length} de {totalPedidosCount} pedidos.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1); // Resetar para a primeira página ao mudar itens por página
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                      <SelectValue placeholder={String(itemsPerPage)} />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map(size => (
                        <SelectItem key={size} value={String(size)} className="text-xs">
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          setCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>

                    {/* Lógica para renderizar links de página (simplificada, pode ser melhorada com ellipsis) */} 
                    {(() => {
                      const totalPages = Math.ceil(totalPedidosCount / itemsPerPage);
                      const pageNumbers = [];
                      // Lógica básica de ellipsis (pode ser expandida)
                      const pageLimit = 5; // Quantos números de página mostrar antes/depois do ellipsis
                      let leftSide = currentPage - Math.floor(pageLimit / 2);
                      let rightSide = currentPage + Math.floor(pageLimit / 2);

                      if (leftSide < 1) {
                        leftSide = 1;
                        rightSide = Math.min(totalPages, pageLimit);
                      }
                      if (rightSide > totalPages) {
                        rightSide = totalPages;
                        leftSide = Math.max(1, totalPages - pageLimit + 1);
                      }

                      if (leftSide > 1) {
                        pageNumbers.push(
                          <PaginationItem key="start-ellipsis">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      for (let i = leftSide; i <= rightSide; i++) {
                        pageNumbers.push(
                          <PaginationItem key={i}>
                            <PaginationLink
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                setCurrentPage(i);
                              }}
                              isActive={currentPage === i}
                              className="cursor-pointer"
                            >
                              {i}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      if (rightSide < totalPages) {
                        pageNumbers.push(
                          <PaginationItem key="end-ellipsis">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return pageNumbers;
                    })()}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          setCurrentPage(prev => Math.min(Math.ceil(totalPedidosCount / itemsPerPage), prev + 1));
                        }}
                        className={cn("cursor-pointer", currentPage === Math.ceil(totalPedidosCount / itemsPerPage) && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPedido && (
        <Dialog open={isViewModalOpen} onOpenChange={(isOpen) => {
          setIsViewModalOpen(isOpen);
          if (!isOpen) {
            setSelectedPedido(null); 
            setActiveRevisao(null); 
            setCurrentRevisaoAdminFeedback("");
            setSelectedAdminActionStatus(undefined);
            setRevisaoAudioFile(null);
            setModalActiveTab("detalhesPedido"); 
          }
        }}>
          <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido: {selectedPedido.id_pedido_serial}</DialogTitle>
              <DialogDescription>
                Visualize e gerencie todos os aspectos do pedido, incluindo solicitações de revisão.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={modalActiveTab} onValueChange={setModalActiveTab} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="detalhesPedido">Detalhes do Pedido</TabsTrigger>
                <TabsTrigger 
                  value="gerenciarRevisao" 
                  disabled={(selectedPedido?.status !== 'em_revisao' && !activeRevisao && !loadingRevisao)}
                >
                  Revisão Solicitada
                  {selectedPedido?.status === 'em_revisao' && (
                    <Badge variant="destructive" className="ml-2 animate-pulse">!</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Aba 1: Detalhes do Pedido */}
              <TabsContent value="detalhesPedido">
                <div className="space-y-6 py-4 pr-3 overflow-y-auto max-h-[calc(80vh-200px)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                    <div className="font-medium text-muted-foreground">Cliente:</div>
                    <div className="md:col-span-2">{selectedPedido.profile?.full_name || selectedPedido.profile?.username || 'N/A'}</div>
                    
                    <div className="font-medium text-muted-foreground">Data/Hora:</div>
                    <div className="md:col-span-2">
                      {new Date(selectedPedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>

                    <div className="font-medium text-muted-foreground">Título do Pedido:</div>
                    <div className="md:col-span-2">{selectedPedido.titulo || 'N/A'}</div>

                    <div className="font-medium text-muted-foreground">Locutor:</div>
                    <div className="md:col-span-2">{selectedPedido.locutores?.nome || 'N/A'}</div>

                    <div className="font-medium text-muted-foreground">Estilo de Locução:</div>
                    <div className="md:col-span-2">{selectedPedido.estilo_locucao || 'N/A'}</div>

                    <div className="font-medium text-muted-foreground self-start pt-1">Tipo de Áudio:</div>
                    <div className="md:col-span-2">
                      {selectedPedido.tipo_audio ? (
                        <Badge 
                          variant={selectedPedido.tipo_audio === 'off' ? 'secondary' : 'default'}
                          className={cn(
                            "text-sm px-3 py-1 font-semibold",
                            selectedPedido.tipo_audio === 'off' && "bg-blue-100 text-blue-700 border-blue-300",
                            selectedPedido.tipo_audio === 'produzido' && "bg-green-100 text-green-700 border-green-300"
                          )}
                        >
                          {selectedPedido.tipo_audio === 'off' ? 'Áudio em OFF' : 'Áudio Produzido'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Não especificado</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Orientações (Briefing):</h4>
                    <div className="p-3 bg-muted/50 rounded-md max-h-32 overflow-y-auto text-sm whitespace-pre-wrap border">
                      {selectedPedido.orientacoes || 'Nenhuma orientação fornecida.'}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Roteiro Completo:</h4>
                    <div className="p-3 bg-muted/50 rounded-md max-h-40 overflow-y-auto text-sm whitespace-pre-wrap border">
                      {selectedPedido.texto_roteiro || 'Nenhum roteiro fornecido.'}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  {/* Campos para alterar status e enviar áudio do pedido principal */}
                  <div className="space-y-2">
                    <Label htmlFor="status-pedido-principal" className="text-sm font-medium">Alterar Status do Pedido Principal:</Label>
                    <Select 
                      value={currentPedidoStatus} 
                      onValueChange={setCurrentPedidoStatus}
                      disabled={selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado' || isUpdatingPedido}
                    >
                      <SelectTrigger id="status-pedido-principal" className="w-full">
                        <SelectValue placeholder="Selecione o novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PEDIDO_STATUS_OPTIONS_FILTRO.filter(opt => opt.value !== 'todos').map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audio-file-principal" className="text-sm font-medium">Enviar Áudio Finalizado (Principal):</Label>
                    <Input 
                      id="audio-file-principal" 
                      type="file" 
                      accept=".mp3,.wav,.ogg,.aac" 
                      onChange={handleFileChange} 
                      className="w-full h-10 px-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" 
                      disabled={selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado' || isUpdatingPedido}
                    />
                    {selectedFile && <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {selectedFile.name}</p>}
                    {selectedPedido.audio_final_url && (
                      <a
                        href={selectedPedido.audio_final_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 px-3 py-1 bg-status-green text-white rounded hover:bg-status-green/90 text-xs font-medium transition-colors"
                      >
                        <DownloadCloud className="h-4 w-4 mr-1" /> Baixar Áudio Principal Atual
                      </a>
                    )}
                  </div>

                  {(selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado') && (
                    <div className="pt-4">
                      <Button 
                        variant="outline"
                        className="w-full border-status-orange text-status-orange hover:bg-status-orange/10 hover:text-status-orange"
                        onClick={handleReopenPedido}
                        disabled={isUpdatingPedido || updateStatusMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reabrir Pedido para Edição
                      </Button>
                    </div>
                  )}
                </div> {/* Fim do scrollable-area da Aba 1 */}
              </TabsContent>

              {/* Aba 2: Gerenciar Revisão */}
              <TabsContent value="gerenciarRevisao">
                <div className="space-y-6 py-4 pr-3 overflow-y-auto max-h-[calc(80vh-200px)]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gerenciamento da Solicitação de Revisão</CardTitle>
                      <CardDescription>
                        Detalhes e ações para a solicitação de revisão ativa deste pedido.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingRevisao && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Carregando detalhes da revisão...</span>
                        </div>
                      )}
                      {!loadingRevisao && !activeRevisao && selectedPedido?.status !== 'em_revisao' && (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma solicitação de revisão pendente ou ativa encontrada para este pedido.
                        </p>
                      )}
                      {!loadingRevisao && !activeRevisao && selectedPedido?.status === 'em_revisao' && (
                        <p className="text-sm text-orange-600 font-semibold">
                          Este pedido está marcado como "Em Revisão" no sistema principal, mas não foi encontrada uma solicitação de revisão correspondente ativa/pendente nos registros de revisões. 
                          Verifique os dados ou se a solicitação foi processada incorretamente.
                        </p>
                      )}
                      {activeRevisao && (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Detalhes da Solicitação do Cliente</h4>
                            <div className="p-3 bg-muted/50 rounded-md border text-sm space-y-2">
                              <p><strong>Data da Solicitação:</strong> {format(new Date(activeRevisao.data_solicitacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                              <p><strong>Status Atual da Revisão:</strong> <Badge variant="outline" className={cn(activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA && "border-orange-500 text-orange-500")}>{activeRevisao.status_revisao.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Badge></p>
                              <div>
                                <p className="mb-1"><strong>Descrição do Cliente:</strong></p>
                                <div className="p-2 bg-background rounded-sm text-xs whitespace-pre-wrap border max-h-28 overflow-y-auto">
                                  {activeRevisao.descricao || 'Nenhuma descrição fornecida.'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {activeRevisao.versoes_audio_revisao && activeRevisao.versoes_audio_revisao.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Áudios de Revisão Anteriores (nesta solicitação)</h4>
                              <ul className="space-y-2 text-xs">
                                {activeRevisao.versoes_audio_revisao.map((versao: VersaoAudioRevisadoDetalhada) => (
                                  <li key={versao.id} className="p-2 border bg-muted/30 rounded-md flex justify-between items-center">
                                    <span className="truncate" title={versao.nome_arquivo_revisado || 'Áudio de revisão'}>
                                      <FileText className="h-3 w-3 mr-1.5 inline-block" /> 
                                      {versao.nome_arquivo_revisado || `Áudio de ${format(new Date(versao.data_envio), "dd/MM/yy")}`}
                                    </span>
                                    <a
                                      href={versao.audio_url_revisado}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium transition-colors"
                                    >
                                      <DownloadCloud className="h-3 w-3 mr-1" /> Baixar
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <Separator />

                          <div> {/* Esta div engloba as Ações do Administrador */}
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Ações do Administrador</h4>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="admin-action-status" className="text-xs font-medium">Definir Status da Revisão:</Label>
                                <Select 
                                  value={selectedAdminActionStatus}
                                  onValueChange={(value) => setSelectedAdminActionStatus(value as TipoRevisaoStatusAdmin)}
                                  disabled={processarRevisaoStatus === 'executing' || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA}
                                >
                                  <SelectTrigger id="admin-action-status">
                                    <SelectValue placeholder="Selecione uma ação/status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.values(REVISAO_STATUS_ADMIN)
                                      .filter(status => status !== REVISAO_STATUS_ADMIN.SOLICITADA) 
                                      .map(status => (
                                        <SelectItem key={status} value={status}>
                                          {status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {(activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA) && (
                                  <p className="text-xs text-muted-foreground mt-1">Esta solicitação de revisão já foi finalizada.</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="admin-feedback-revisao" className="text-xs font-medium">Feedback para o Cliente (Opcional):</Label>
                                <Textarea
                                  id="admin-feedback-revisao"
                                  placeholder="Seu feedback sobre a revisão..."
                                  value={currentRevisaoAdminFeedback}
                                  onChange={(e) => setCurrentRevisaoAdminFeedback(e.target.value)}
                                  rows={3}
                                  disabled={processarRevisaoStatus === 'executing' || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="revisao-audio-file" className="text-xs font-medium">Enviar Novo Áudio Revisado (se aplicável):</Label>
                                <Input
                                  id="revisao-audio-file"
                                  type="file"
                                  accept=".mp3,.wav,.ogg,.aac"
                                  onChange={(e) => setRevisaoAudioFile(e.target.files ? e.target.files[0] : null)}
                                  className="h-10 px-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                  disabled={processarRevisaoStatus === 'executing' || selectedAdminActionStatus !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN || activeRevisao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA}
                                />
                                {revisaoAudioFile && <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: {revisaoAudioFile.name}</p>}
                                 {selectedAdminActionStatus !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && activeRevisao.status_revisao !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && activeRevisao.status_revisao !== REVISAO_STATUS_ADMIN.NEGADA && (
                                   <p className="text-xs text-muted-foreground mt-1">O upload de áudio só é habilitado ao selecionar "Concluída pelo Admin".</p>
                                 )}
                              </div>
                            </div> {/* Fechamento do div space-y-4 das Ações do Admin */}
                          </div> {/* Fechamento do div que engloba Ações do Administrador */}
                        </div> /* Fechamento do div space-y-6 principal de activeRevisao */
                      )}
                    </CardContent>
                  </Card>

                  {/* Bloco do Histórico de TODAS as Revisões movido para cá */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Histórico Completo de Revisões do Pedido</CardTitle>
                      <CardDescription>
                        Todas as solicitações de revisão anteriores e seus processamentos para este pedido.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistoricoRevisoesPedido && (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Carregando histórico de revisões...</span>
                        </div>
                      )}
                      {isErrorHistoricoRevisoesPedido && (
                        <p className="text-sm text-red-600">
                          Erro ao carregar histórico: {errorHistoricoRevisoesPedido?.message}
                        </p>
                      )}
                      {!isLoadingHistoricoRevisoesPedido && !isErrorHistoricoRevisoesPedido && historicoRevisoesPedido && (
                        <div className="p-3 bg-muted/30 rounded-md max-h-96 overflow-y-auto text-xs border space-y-4">
                          {historicoRevisoesPedido.length === 0 ? (
                            <p className="text-muted-foreground italic">Nenhuma solicitação de revisão encontrada para este pedido.</p>
                          ) : (
                            historicoRevisoesPedido.map((solicitacao, index) => (
                              <div key={solicitacao.id} className="p-3 bg-background border rounded-md shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-semibold text-foreground">
                                    Solicitação de Revisão #{index + 1}
                                  </h5>
                                  <Badge 
                                    variant={solicitacao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA ? 'outline' : 
                                              solicitacao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN ? 'default' :
                                              solicitacao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA ? 'destructive' : 
                                              'secondary'
                                            }
                                    className={cn(
                                      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA && 'border-orange-500 text-orange-500',
                                      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && 'bg-green-600 text-white',
                                      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA && 'bg-red-600 text-white'
                                    )}
                                  >
                                    {solicitacao.status_revisao.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </Badge>
                                </div>
                                <p className="mb-1"><span className="font-medium text-muted-foreground">Data:</span> {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                                <p className="mb-1"><span className="font-medium text-muted-foreground">Cliente:</span></p>
                                <div className="p-2 bg-muted rounded-sm text-xs whitespace-pre-wrap border mb-2 max-h-28 overflow-y-auto">{solicitacao.descricao || 'N/D'}</div>
                                {solicitacao.admin_feedback && <><p className="mb-1 mt-2"><span className="font-medium text-muted-foreground">Admin:</span></p><div className="p-2 bg-muted rounded-sm text-xs whitespace-pre-wrap border mb-2 max-h-28 overflow-y-auto">{solicitacao.admin_feedback}</div></>}
                                {solicitacao.data_conclusao_revisao && <p className="mb-2"><span className="font-medium text-muted-foreground">Conclusão:</span> {format(new Date(solicitacao.data_conclusao_revisao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
                                {solicitacao.versoes_audio_revisao && solicitacao.versoes_audio_revisao.length > 0 && (<div className="mt-3"><h6 className="text-xs font-semibold text-muted-foreground mb-1">Áudios:</h6><ul className="space-y-2">{solicitacao.versoes_audio_revisao.map((versao: VersaoAudioRevisadoDetalhada) => (<li key={versao.id} className="p-2 border bg-background/50 rounded-md"><div className="flex justify-between items-center"><span className="text-xs font-medium truncate" title={versao.nome_arquivo_revisado || ''}><FileText className="h-3 w-3 mr-1 inline-block" /> {versao.nome_arquivo_revisado || 'Áudio'}</span>{versao.audio_url_revisado && (<a href={versao.audio_url_revisado} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium transition-colors"><DownloadCloud className="h-3 w-3 mr-1" /> Baixar</a>)}</div><p className="text-xs text-muted-foreground mt-1">Em: {format(new Date(versao.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>{versao.comentario_admin && (<div className="mt-1"><p className="text-xs font-semibold text-muted-foreground">Comentário:</p><p className="text-xs text-muted-foreground whitespace-pre-wrap">{versao.comentario_admin}</p></div>)}</li>))}</ul></div>)}
                                {index < historicoRevisoesPedido.length - 1 && <Separator className="my-3" />}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                 <Button variant="outline" disabled={isUpdatingPedido || updateStatusMutation.isPending || processarRevisaoStatus === 'executing'}>Cancelar</Button>
              </DialogClose>
              
              {modalActiveTab === 'detalhesPedido' && selectedPedido && (selectedPedido.status !== 'concluido' && selectedPedido.status !== 'cancelado') && (
                <Button 
                  onClick={handleUpdatePedido} 
                  disabled={isUpdatingPedido || updateStatusMutation.isPending || (!selectedFile && currentPedidoStatus === selectedPedido.status)}
                >
                  {isUpdatingPedido || updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                  Salvar Pedido
                </Button>
              )}

              {modalActiveTab === 'gerenciarRevisao' && activeRevisao && activeRevisao.status_revisao !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && activeRevisao.status_revisao !== REVISAO_STATUS_ADMIN.NEGADA && (
                <Button
                  onClick={() => {
                    if (!activeRevisao?.id || !selectedAdminActionStatus) {
                      toast.error("ID da solicitação ou status da ação do admin não definido.");
                      return;
                    }
                    // Lógica para CONCLUIDA_PELO_ADMIN e audioFile pode ser mantida ou ajustada
                    executeProcessarRevisao({
                      solicitacaoId: activeRevisao.id,
                      adminFeedback: currentRevisaoAdminFeedback,
                      audioFile: revisaoAudioFile, 
                      novoStatusRevisao: selectedAdminActionStatus,
                    });
                  }}
                  disabled={processarRevisaoStatus === 'executing' || !selectedAdminActionStatus}
                >
                  {processarRevisaoStatus === 'executing' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Processar Revisão
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

export default AdminDashboardPage; 