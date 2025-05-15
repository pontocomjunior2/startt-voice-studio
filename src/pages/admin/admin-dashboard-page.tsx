import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Hook para solicitações de revisão
import { useFetchAdminSolicitacoesRevisao } from '../../hooks/admin/use-fetch-admin-solicitacoes-revisao.hook';
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

// Definição dos status possíveis do pedido
const PEDIDO_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'gravando', label: 'Gravando' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

// Novo hook para upload e update
import { useUploadPedidoAudio } from '../../hooks/mutations/use-upload-pedido-audio.hook';
import { useUpdatePedidoAudioAndStatus } from '../../hooks/mutations/use-update-pedido-audio-and-status.hook';

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
  
  // Estados para os pedidos filtrados e loading
  const [pedidosAdmin, setPedidosAdmin] = useState<AdminPedido[]>([]);
  const [loadingPedidosAdmin, setLoadingPedidosAdmin] = useState(true);

  const {
    solicitacoes: solicitacoesRevisao = [],
    isLoading: isLoadingSolicitacoesRevisao,
    error: fetchSolicitacoesRevisaoError,
    refreshSolicitacoes: refreshSolicitacoesRevisao
  } = useFetchAdminSolicitacoesRevisao();

  console.log(
    'AdminDashboard RENDER: isFetchingStats:',
    isFetchingStats,
    'isLoadingSolicitacoesRevisao:',
    isLoadingSolicitacoesRevisao
  );

  const [selectedPedido, setSelectedPedido] = useState<AdminPedido | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [currentPedidoStatus, setCurrentPedidoStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdatingPedido, setIsUpdatingPedido] = useState(false);

  const [isRevisaoDetailsModalOpen, setIsRevisaoDetailsModalOpen] = useState(false);
  const [selectedSolicitacaoRevisao, setSelectedSolicitacaoRevisao] = useState<SolicitacaoRevisaoAdmin | null>(null);
  const [adminFeedbackText, setAdminFeedbackText] = useState("");
  const [revisaoAudioFile, setRevisaoAudioFile] = useState<File | null>(null);
  const [isSubmittingRevisaoAdmin, setIsSubmittingRevisaoAdmin] = useState(false);
  const [selectedAdminActionStatus, setSelectedAdminActionStatus] = useState<TipoRevisaoStatusAdmin | undefined>(undefined);

  const {
    data: historicoRevisoesPedido,
    isLoading: isLoadingHistoricoRevisoesPedido,
    isError: isErrorHistoricoRevisoesPedido,
    error: errorHistoricoRevisoesPedido,
  } = useFetchSolicitacoesRevisaoDetalhadasPorPedido({
    pedidoId: selectedPedido?.id || null,
    enabled: isViewModalOpen && !!selectedPedido?.id,
  });

  const updateStatusMutation = useUpdatePedidoStatus();
  const uploadAudioMutation = useUploadPedidoAudio();
  const updateAudioAndStatusMutation = useUpdatePedidoAudioAndStatus();

  const { 
    execute: executeProcessarRevisao, 
    status: processarRevisaoStatus,
    result: processarRevisaoResult,
    reset: resetProcessarRevisaoAction,
  } = useAction(processarRevisaoAdminAction, {
    onExecute: () => {
      console.log('[AdminDashboardPage] Executando processarRevisaoAdminAction...');
      toast.loading('Processando revisão...');
      setIsSubmittingRevisaoAdmin(true);
    },
    onSuccess: (data: Awaited<ReturnType<typeof processarRevisaoAdminAction>>) => {
      toast.dismiss();
      console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - Data:', JSON.stringify(data, null, 2));

      if (data?.data?.success && typeof data.data.success === 'string') {
        toast.success(data.data.success);
        console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - Chamando setIsRevisaoDetailsModalOpen(false)');
        setIsRevisaoDetailsModalOpen(false);
        refreshSolicitacoesRevisao(); 
        queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
        fetchPedidosAdmin();

        setAdminFeedbackText("");
        setRevisaoAudioFile(null);
        setSelectedAdminActionStatus(undefined); 
      } else if (data?.data?.failure && typeof data.data.failure === 'string') {
        toast.error(`Falha ao processar revisão: ${data.data.failure}`);
        console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - Failure branch (from action). Modal NÃO será fechado automaticamente.');
      } else if (data?.serverError && typeof data.serverError === 'string') {
        if (data.serverError === "ACESSO_NEGADO_ADMIN") {
          toast.error("Acesso negado. Você não tem permissão para executar esta ação.");
        } else {
          toast.error(`Erro do servidor: ${data.serverError}`);
        }
        console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - ServerError branch (from next-safe-action). Modal NÃO será fechado automaticamente.');
      } else if (data?.validationErrors) {
        console.log('[AdminDashboardPage] processarRevisaoAdminAction onSuccess - ValidationErrors branch. Modal NÃO será fechado automaticamente (deveria ser pego pelo onError).');
      } else {
        console.log('[AdminDashboardPage] processarReivadoAdminAction onSuccess - Data não reconhecida ou estrutura inesperada. Modal NÃO será fechado.', data);
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
      setIsSubmittingRevisaoAdmin(false);
    }
  });

  // Nova função para buscar pedidos com filtros
  const fetchPedidosAdmin = async () => {
    console.log('[AdminDashboardPage] fetchPedidosAdmin chamado com filtros:', { filtroStatus, filtroData });
    setLoadingPedidosAdmin(true);
    try {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          created_at,
          status,
          texto_roteiro,
          creditos_debitados,
          titulo,
          estilo_locucao,
          audio_final_url,
          downloaded_at,
          tipo_audio,
          orientacoes,
          id_pedido_serial,
          user_id,
          profile:profiles ( id, full_name, email, username ),
          locutores ( id, nome )
        `)
        .order('created_at', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      if (filtroData?.from) {
        query = query.gte('created_at', format(startOfDay(filtroData.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }
      if (filtroData?.to) {
        query = query.lte('created_at', format(endOfDay(filtroData.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AdminDashboardPage] Erro ao buscar pedidos admin:', error);
        toast.error('Erro ao buscar pedidos.');
        setPedidosAdmin([]);
      } else {
        // Garantir que profile e locutores sejam objetos ou null
        const pedidosFormatados = data.map(p => {
          const profileData = Array.isArray(p.profile) ? p.profile[0] : p.profile;
          const locutorData = Array.isArray(p.locutores) ? p.locutores[0] : p.locutores;
          return {
            ...p,
            profile: profileData || null,
            locutores: locutorData || null,
          };
        }) as AdminPedido[];
        console.log('[AdminDashboardPage] Pedidos recebidos e formatados:', pedidosFormatados);
        setPedidosAdmin(pedidosFormatados);
      }
    } catch (e) {
      console.error('[AdminDashboardPage] Exceção ao buscar pedidos admin:', e);
      toast.error('Ocorreu uma exceção ao buscar os pedidos.');
      setPedidosAdmin([]);
    } finally {
      setLoadingPedidosAdmin(false);
    }
  };

  // useEffect para buscar pedidos quando os filtros mudarem
  useEffect(() => {
    fetchPedidosAdmin();
  }, [filtroStatus, filtroData]);

  const handleOpenViewModal = (pedido: AdminPedido) => {
    console.log('[AdminDashboardPage] Abrindo modal para pedido (objeto completo):', pedido);
    console.log('[AdminDashboardPage] Valor de tipo_audio para o modal:', pedido.tipo_audio);
    setSelectedPedido(pedido);
    setCurrentPedidoStatus(pedido.status);
    setSelectedFile(null);
    setIsViewModalOpen(true);
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

  const handleOpenRevisaoDetailsModal = (solicitacao: SolicitacaoRevisaoAdmin) => {
    setSelectedSolicitacaoRevisao(solicitacao);
    setAdminFeedbackText(solicitacao.admin_feedback || "");
    setRevisaoAudioFile(null);
    
    if (
      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA ||
      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN ||
      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.NEGADA
    ) {
      setSelectedAdminActionStatus(undefined); 
    } else if (
      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN ||
      solicitacao.status_revisao === REVISAO_STATUS_ADMIN.AGUARDANDO_UPLOAD_ADMIN
    ) {
      setSelectedAdminActionStatus(solicitacao.status_revisao as TipoRevisaoStatusAdmin);
    } else {
      setSelectedAdminActionStatus(undefined); 
    }

    setIsSubmittingRevisaoAdmin(false);
    resetProcessarRevisaoAction();
    setIsRevisaoDetailsModalOpen(true);
  };

  const handleRevisaoAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setRevisaoAudioFile(event.target.files[0]);
    }
  };

  const handleSubmitAdminRevisao = async () => {
    if (!selectedSolicitacaoRevisao) {
      toast.error("Nenhuma solicitação de revisão selecionada.");
      return;
    }
    if (!selectedAdminActionStatus) {
      toast.error("Por favor, selecione uma ação para a revisão.");
      return;
    }
    
    executeProcessarRevisao({
      solicitacaoId: selectedSolicitacaoRevisao.id_solicitacao,
      adminFeedback: adminFeedbackText || undefined,
      audioFile: revisaoAudioFile || undefined,
      novoStatusRevisao: selectedAdminActionStatus,
    });
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
      title: "Correções Pendentes", 
      icon: MessageSquare, 
      value: solicitacoesRevisao.length, 
      isLoadingProperty: isLoadingSolicitacoesRevisao, 
      subtext: "Solicitações de revisão aguardando processamento",
      iconColorClass: "text-status-orange", 
      tagColorClass: "bg-status-orange text-white"
    },
    { 
      title: "Pedidos Pendentes", 
      valueKey: "pendingorders",
      icon: ListChecks,
      subtext: "Pedidos aguardando gravação",
      iconColorClass: "text-status-orange",
      tagKey: "pendingorders",
      tagColorClass: "bg-status-orange text-white"
    },
  ];

  const isLoading = isLoadingStats || loadingPedidosAdmin || isLoadingSolicitacoesRevisao;

  const adminRevisaoStatusOptions = [
    { value: REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN, label: 'Concluir Revisão (Enviar Feedback/Áudio)' },
    { value: REVISAO_STATUS_ADMIN.NEGADA, label: 'Negar Solicitação de Revisão' },
    { value: REVISAO_STATUS_ADMIN.EM_ANDAMENTO_ADMIN, label: 'Marcar como: Em Andamento pelo Admin' },
    { value: REVISAO_STATUS_ADMIN.AGUARDANDO_UPLOAD_ADMIN, label: 'Marcar como: Aguardando Upload Interno' },
  ];

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
              console.log('isFetchingActiveOrders:', 'isFetchingFinalizedOrders:', 'isLoadingSolicitacoesRevisao:', isLoadingSolicitacoesRevisao);
              console.log('isLoadingPedidosAdmin (antes do fetch direto):', loadingPedidosAdmin);
              console.log('isLoadingSolicitacoesRevisao (antes do refresh direto):', isLoadingSolicitacoesRevisao);

              console.log('Invalidando adminDashboardStats...');
              queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
              
              console.log('Chamando fetchPedidosAdmin diretamente...');
              fetchPedidosAdmin();

              console.log('Chamando refreshSolicitacoesRevisao...');
              refreshSolicitacoesRevisao(); 
              
              console.log('--- Invalidações e Refresh Chamados ---');
            }}
            disabled={isFetchingStats || loadingPedidosAdmin || isLoadingSolicitacoesRevisao}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isFetchingStats || loadingPedidosAdmin || isLoadingSolicitacoesRevisao) && "animate-spin")} />
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

            if (cardInfo.title === "Correções Pendentes") {
              const specificLoading = cardInfo.isLoadingProperty;
              Icon = specificLoading ? Loader2 : cardInfo.icon;
              value = specificLoading ? null : solicitacoesRevisao.length;
            }

            return (
              <Card key={`stat-${index}`} className={`shadow-sm hover:shadow-md transition-shadow rounded-lg`}>
                {cardInfo.isLoading || (cardInfo.title === "Correções Pendentes" && cardInfo.isLoadingProperty) ? (
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
              Pedidos ({loadingPedidosAdmin ? '...' : pedidosAdmin.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPedidosAdmin ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-gray-600">Carregando pedidos...</p>
              </div>
            ) : pedidosAdmin.length > 0 ? (
              <Table>
                <TableCaption>
                  {pedidosAdmin.length === 0 ? "Nenhum pedido encontrado com os filtros atuais." : `Exibindo ${pedidosAdmin.length} pedido(s).`}
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
                  {pedidosAdmin.map((pedido) => (
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
          </CardContent>
        </Card>
      </div>

      {selectedPedido && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido: {selectedPedido.id_pedido_serial}</DialogTitle>
              <DialogDescription>
                Visualização completa das informações do pedido e seu histórico.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 pr-3 overflow-y-auto max-h-[70vh]">
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

              {/* Seção para o Histórico de Revisões do Pedido */}
              <Separator className="my-4" />
              <div>
                <h4 className="text-md font-semibold text-foreground mb-2">Histórico de Revisões deste Pedido:</h4>
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
                              {solicitacao.status_revisao.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </div>

                          <p className="mb-1">
                            <span className="font-medium text-muted-foreground">Data:</span> {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <p className="mb-1">
                            <span className="font-medium text-muted-foreground">Descrição do Cliente:</span>
                          </p>
                          <div className="p-2 bg-muted rounded-sm text-xs whitespace-pre-wrap border mb-2 max-h-28 overflow-y-auto">
                            {solicitacao.descricao_cliente || 'Nenhuma descrição fornecida.'}
                          </div>
                          
                          {solicitacao.admin_feedback && (
                            <>
                              <p className="mb-1 mt-2">
                                <span className="font-medium text-muted-foreground">Feedback do Admin:</span>
                              </p>
                              <div className="p-2 bg-muted rounded-sm text-xs whitespace-pre-wrap border mb-2 max-h-28 overflow-y-auto">
                                {solicitacao.admin_feedback}
                              </div>
                            </>
                          )}

                          {solicitacao.data_conclusao_revisao && (
                            <p className="mb-2">
                              <span className="font-medium text-muted-foreground">Data Conclusão da Revisão:</span> {format(new Date(solicitacao.data_conclusao_revisao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          )}

                          {solicitacao.versoes_audio_revisao && solicitacao.versoes_audio_revisao.length > 0 && (
                            <div className="mt-3">
                              <h6 className="text-xs font-semibold text-muted-foreground mb-1">Áudios Enviados nesta Revisão:</h6>
                              <ul className="space-y-2">
                                {solicitacao.versoes_audio_revisao.map((versao: VersaoAudioRevisadoDetalhada) => (
                                  <li key={versao.id} className="p-2 border bg-background/50 rounded-md">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-medium truncate" title={versao.nome_arquivo_revisado || 'Nome não disponível'}>
                                        <FileText className="h-3 w-3 mr-1 inline-block" /> {versao.nome_arquivo_revisado || 'Áudio revisado'}
                                      </span>
                                      {versao.audio_url_revisado && (
                                        <a
                                          href={versao.audio_url_revisado}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium transition-colors"
                                        >
                                          <DownloadCloud className="h-3 w-3 mr-1" /> Baixar
                                        </a>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Enviado em: {format(new Date(versao.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                    {versao.comentario_admin && (
                                      <div className="mt-1">
                                        <p className="text-xs font-semibold text-muted-foreground">Comentário do Admin (sobre o áudio):</p>
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{versao.comentario_admin}</p>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                           {index < historicoRevisoesPedido.length - 1 && <Separator className="my-3" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <label htmlFor="status-pedido" className="text-sm font-medium text-muted-foreground">Alterar Status do Pedido:</label>
                <Select 
                  value={currentPedidoStatus} 
                  onValueChange={setCurrentPedidoStatus}
                  disabled={selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado'}
                >
                  <SelectTrigger id="status-pedido" className="w-full">
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PEDIDO_STATUS_OPTIONS.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={(selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado') && option.value !== selectedPedido.status}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="audio-file" className="text-sm font-medium text-muted-foreground">Enviar Áudio Finalizado:</label>
                <Input 
                  id="audio-file" 
                  type="file" 
                  accept=".mp3,.wav,.ogg,.aac" 
                  onChange={handleFileChange} 
                  className="w-full h-10 px-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" 
                  disabled={selectedPedido.status === 'concluido' || selectedPedido.status === 'cancelado'}
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
                    <UploadCloud className="h-4 w-4 mr-1" /> Baixar Áudio Atual
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
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                 <Button variant="outline" disabled={isUpdatingPedido || updateStatusMutation.isPending}>Cancelar</Button>
              </DialogClose>
              {(selectedPedido.status !== 'concluido' && selectedPedido.status !== 'cancelado') && (
                <Button 
                  onClick={handleUpdatePedido} 
                  disabled={isUpdatingPedido || updateStatusMutation.isPending || (!selectedFile && currentPedidoStatus === selectedPedido.status)}
                >
                  {isUpdatingPedido || updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                  Salvar Alterações
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Seção de Solicitações de Revisão */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-6 w-6 text-orange-500" />
            Solicitações de Revisão Pendentes
            {isLoadingSolicitacoesRevisao && !solicitacoesRevisao.length && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSolicitacoesRevisao && solicitacoesRevisao.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : fetchSolicitacoesRevisaoError ? (
            <div className="text-red-600 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Erro ao carregar solicitações: {fetchSolicitacoesRevisaoError}
            </div>
          ) : solicitacoesRevisao.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação de revisão pendente no momento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Título Pedido</TableHead>
                  <TableHead>Status Revisão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoesRevisao.map((solicitacao) => (
                  <TableRow key={solicitacao.id_solicitacao}>
                    <TableCell className="font-medium">{solicitacao.pedido_id_serial}</TableCell>
                    <TableCell>{solicitacao.cliente_nome || 'N/A'}</TableCell>
                    <TableCell>
                      {(() => {
                        const date = new Date(solicitacao.data_solicitacao);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                      })()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={solicitacao.pedido_titulo || undefined}>{solicitacao.pedido_titulo || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={solicitacao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA ? 'outline' : 'default'} className={solicitacao.status_revisao === REVISAO_STATUS_ADMIN.SOLICITADA ? 'border-orange-500 text-orange-500' : ''}>
                        {solicitacao.status_revisao.charAt(0).toUpperCase() + solicitacao.status_revisao.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenRevisaoDetailsModal(solicitacao)}>
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE DETALHES DA SOLICITAÇÃO DE REVISÃO (isRevisaoDetailsModalOpen) ... continua igual ... */}
      {selectedSolicitacaoRevisao && (
        <Dialog open={isRevisaoDetailsModalOpen} onOpenChange={setIsRevisaoDetailsModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação de Revisão</DialogTitle>
              <DialogDescription>
                Pedido ID: {selectedSolicitacaoRevisao.pedido_id_serial} <br />
                Cliente: {selectedSolicitacaoRevisao.cliente_nome || 'Não informado'} ({selectedSolicitacaoRevisao.cliente_email || 'Email não informado'}) <br />
                Data da Solicitação: {new Date(selectedSolicitacaoRevisao.data_solicitacao).toLocaleString()} <br />
                Título do Pedido: {selectedSolicitacaoRevisao.pedido_titulo || 'Não informado'} <br />
                Descrição da Solicitação pelo Cliente: <br />
                <div className="mt-1 p-2 border rounded-md bg-stone-50 whitespace-pre-wrap text-sm">
                  {selectedSolicitacaoRevisao.descricao_cliente}
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="revisaoAdminStatus" className="text-right">
                  Ação da Revisão <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedAdminActionStatus}
                  onValueChange={(value) => setSelectedAdminActionStatus(value as TipoRevisaoStatusAdmin)}
                >
                  <SelectTrigger id="revisaoAdminStatus" className="col-span-3">
                    <SelectValue placeholder="Selecione a ação para esta revisão" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRevisaoStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminFeedback" className="text-right">
                  Feedback do Admin
                </Label>
                <Textarea
                  id="adminFeedback"
                  value={adminFeedbackText}
                  onChange={(e) => setAdminFeedbackText(e.target.value)}
                  className="col-span-3"
                  placeholder="Seu feedback para o cliente sobre a revisão (opcional)"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4"> 
                <Label htmlFor="revisaoAudioFile" className="text-right pt-2"> 
                  Áudio Revisado
                </Label>
                <div className="col-span-3 space-y-1"> 
                  <Input
                    id="revisaoAudioFile"
                    type="file"
                    onChange={handleRevisaoAudioFileChange}
                    className="w-full"
                    accept="audio/*"
                  />
                  {revisaoAudioFile && (
                    <p className="text-sm text-muted-foreground truncate" title={revisaoAudioFile.name}> 
                      Arquivo: {revisaoAudioFile.name} ({(revisaoAudioFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
               {/* Exibir erros de validação do Zod da Action */}
              {processarRevisaoStatus === 'hasValidationError' && processarRevisaoResult.validationErrors && (
                <div className="col-span-4 mt-2 text-sm text-red-600 bg-red-100 p-3 rounded-md">
                  <p className="font-semibold mb-1">Por favor, corrija os seguintes erros:</p>
                  <ul className="list-disc list-inside">
                    {Object.entries(processarRevisaoResult.validationErrors).map(([field, errors]) => (
                      <li key={field}>
                        {/* @ts-ignore */}
                        <strong>{field === 'audioFile' ? 'Arquivo de Áudio' : field}:</strong> {errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={handleSubmitAdminRevisao} 
                disabled={processarRevisaoStatus === 'executing' || !selectedAdminActionStatus || isSubmittingRevisaoAdmin}
              >
                {processarRevisaoStatus === 'executing' || isSubmittingRevisaoAdmin ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Processar Revisão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

export default AdminDashboardPage; 