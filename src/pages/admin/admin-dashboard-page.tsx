import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, ListChecks, AlertTriangle, Loader2, FileText, CalendarDays, UserCircle, Eye, UploadCloud, Save, RotateCcw, RefreshCw } from 'lucide-react';
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

// Hook e tipo customizado
import { useFetchAdminDashboardStats } from '../../hooks/queries/use-fetch-admin-dashboard-stats.hook';
import type { AdminDashboardStats } from '../../hooks/queries/use-fetch-admin-dashboard-stats.hook';

// Hook e tipo para pedidos pendentes/ativos
import { useFetchAdminActiveOrders } from '../../hooks/queries/use-fetch-admin-pending-orders.hook';
import { useFetchAdminFinalizedOrders } from '../../hooks/queries/use-fetch-admin-finalized-orders.hook';
import type { AdminPedido } from '../../hooks/queries/use-fetch-admin-pending-orders.hook';
import { useUpdatePedidoStatus } from '../../hooks/mutations/use-update-pedido-status.hook';

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

// Importar useQueryClient
import { useQueryClient } from '@tanstack/react-query';

function AdminDashboardPage() {
  const queryClient = useQueryClient(); // Inicializar queryClient

  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    isFetching: isFetchingStats,
    isError: isFetchStatsError, 
    error: fetchStatsError 
  } = useFetchAdminDashboardStats();

  const {
    data: activeOrders = [],
    isLoading: isLoadingActiveOrders,
    isFetching: isFetchingActiveOrders,
    isError: isFetchActiveOrdersError,
    error: fetchActiveOrdersError
  } = useFetchAdminActiveOrders();

  const {
    data: finalizedOrders = [],
    isLoading: isLoadingFinalizedOrders,
    isFetching: isFetchingFinalizedOrders,
    isError: isFetchFinalizedOrdersError,
    error: fetchFinalizedOrdersError
  } = useFetchAdminFinalizedOrders();

  // Log para observar os estados de isFetching em cada renderização
  console.log(
    'AdminDashboard RENDER: isFetchingStats:',
    isFetchingStats,
    'isFetchingActiveOrders:',
    isFetchingActiveOrders,
    'isFetchingFinalizedOrders:',
    isFetchingFinalizedOrders
  );

  const [selectedPedido, setSelectedPedido] = useState<AdminPedido | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Novos estados para o formulário do modal
  const [currentPedidoStatus, setCurrentPedidoStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdatingPedido, setIsUpdatingPedido] = useState(false); // Para feedback no botão de salvar

  // Inicializar a mutation
  const updateStatusMutation = useUpdatePedidoStatus();
  // Novo hook para upload e update
  const uploadAudioMutation = useUploadPedidoAudio();
  const updateAudioAndStatusMutation = useUpdatePedidoAudioAndStatus();

  // Log para verificar dados dos hooks
  useEffect(() => {
    if (activeOrders.length > 0) {
      console.log("[AdminDashboardPage] Pedidos Ativos Recebidos (amostra):");
      activeOrders.slice(0, 2).forEach(p => console.log({ id: p.id_pedido_serial, tipo_audio: p.tipo_audio, status: p.status, titulo: p.titulo }));
    }
    if (finalizedOrders.length > 0) {
      console.log("[AdminDashboardPage] Pedidos Finalizados Recebidos (amostra):");
      finalizedOrders.slice(0, 2).forEach(p => console.log({ id: p.id_pedido_serial, tipo_audio: p.tipo_audio, status: p.status, titulo: p.titulo }));
    }
  }, [activeOrders, finalizedOrders]);

  const handleOpenViewModal = (pedido: AdminPedido) => {
    console.log('[AdminDashboardPage] Abrindo modal para pedido (objeto completo):', pedido);
    console.log('[AdminDashboardPage] Valor de tipo_audio para o modal:', pedido.tipo_audio);
    setSelectedPedido(pedido);
    setCurrentPedidoStatus(pedido.status); // Inicializa o status no modal
    setSelectedFile(null); // Reseta o arquivo selecionado
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
      if (fileHasBeenSelected) {
        // Upload do arquivo
        const username = selectedPedido.profile?.username;
        if (!username) throw new Error('Username do cliente não encontrado.');
        const uploadResult = await uploadAudioMutation.mutateAsync({ file: selectedFile!, username });
        // Atualiza pedido com URL e status (sempre conclui ao enviar áudio)
        await updateAudioAndStatusMutation.mutateAsync({
          pedidoId: selectedPedido.id,
          audioUrl: uploadResult.filePath,
          novoStatus: 'concluido',
        });
      } else if (statusHasChanged) {
        // Apenas o status mudou
        await updateStatusMutation.mutateAsync({
          pedidoId: selectedPedido.id,
          novoStatus: currentPedidoStatus,
        });
      }
      setIsViewModalOpen(false);
    } catch (error) {
      // Toasts já são tratados nos hooks
      console.error('Erro em handleUpdatePedido:', error);
    } finally {
      setIsUpdatingPedido(false);
    }
  };

  const handleReopenPedido = async () => {
    if (!selectedPedido || (selectedPedido.status !== 'concluido' && selectedPedido.status !== 'cancelado')) return;

    setIsUpdatingPedido(true); // Reutilizar o estado de loading

    try {
      const novoStatusParaReabertura = 'pendente'; // Define o status para o qual o pedido será revertido
      await updateStatusMutation.mutateAsync({
        pedidoId: selectedPedido.id,
        novoStatus: novoStatusParaReabertura,
      });

      // Atualizar o estado local para refletir a mudança imediatamente no modal
      setSelectedPedido(prev => prev ? { ...prev, status: novoStatusParaReabertura, audio_final_url: null } : null); // Limpa audio_final_url ao reabrir
      setCurrentPedidoStatus(novoStatusParaReabertura);
      setSelectedFile(null); // Reseta o arquivo selecionado

      // A invalidação das queries (useFetchAdminActiveOrders, useFetchAdminFinalizedOrders)
      // deve ser tratada no onSuccess do hook useUpdatePedidoStatus para mover o pedido entre as tabelas.
    } catch (error) {
      // Toasts já são tratados nos hooks de mutação
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
      title: "Pedidos Pendentes", 
      valueKey: "pendingorders",
      icon: ListChecks,
      subtext: "Pedidos aguardando gravação",
      iconColorClass: "text-status-orange",
      tagKey: "pendingorders",
      tagColorClass: "bg-status-orange text-white"
    },
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
              console.log('Estados de Fetching ANTES da invalidação:');
              console.log('isFetchingStats:', isFetchingStats);
              console.log('isFetchingActiveOrders:', isFetchingActiveOrders);
              console.log('isFetchingFinalizedOrders:', isFetchingFinalizedOrders);

              console.log('Invalidando adminDashboardStats...');
              queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
              
              console.log('Invalidando adminActiveOrders...');
              queryClient.invalidateQueries({ queryKey: ['adminActiveOrders'] });
              
              console.log('Invalidando adminFinalizedOrders...');
              queryClient.invalidateQueries({ queryKey: ['adminFinalizedOrders'] });
              
              console.log('--- Invalidações Chamadas ---');
            }}
            disabled={isFetchingStats || isFetchingActiveOrders || isFetchingFinalizedOrders}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isFetchingStats || isFetchingActiveOrders || isFetchingFinalizedOrders) && "animate-spin")} />
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
            const Icon = cardInfo.isLoading ? Loader2 : cardInfo.icon;
            const value = cardInfo.isLoading ? null : (cardInfo.valueKey && stats ? stats[cardInfo.valueKey as keyof AdminDashboardStats] : cardInfo.fixedValue);
            const tagText = cardInfo.isLoading ? null : (cardInfo.tagKey && stats ? stats[cardInfo.tagKey as keyof AdminDashboardStats] : cardInfo.tagText);

            return (
              <Card key={`stat-${index}`} className={`shadow-sm hover:shadow-md transition-shadow rounded-lg`}>
                {cardInfo.isLoading ? (
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
                      {value !== undefined && value !== null ? value.toLocaleString('pt-BR') : (cardInfo.valueKey === undefined && !cardInfo.fixedValue) ? '-' : '0'}
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
          <h2 className="text-xl font-semibold text-foreground">Pedidos Ativos (Pendentes e Gravando)</h2>
        </div>
        <Separator className="my-4" />
        {isFetchActiveOrdersError && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            Erro ao carregar pedidos ativos: {fetchActiveOrdersError?.message}
          </div>
        )}
        {isLoadingActiveOrders ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Carregando pedidos ativos...</p>
          </div>
        ) : activeOrders.length === 0 && !isFetchActiveOrdersError ? (
          <div className="text-center py-10">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum Pedido Ativo</h3>
            <p className="mt-1 text-sm text-muted-foreground">Não há pedidos pendentes ou em gravação no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative border border-border rounded-md">
            <Table>
              <TableCaption className="py-3">Lista de pedidos com status 'pendente' ou 'gravando'.</TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Nº Pedido</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"><CalendarDays className="inline-block mr-1 h-4 w-4"/>Data/Hora Pedido</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"><UserCircle className="inline-block mr-1 h-4 w-4"/>Cliente</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trecho do Roteiro</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {activeOrders.map((pedido) => {
                  const clienteNome = pedido.profile 
                                    ? pedido.profile.full_name || pedido.profile.username 
                                    : 'Usuário Desconhecido';
                  return (
                    <TableRow key={pedido.id} className="hover:bg-muted/50 odd:bg-muted/20">
                      <TableCell className="font-medium">{pedido.id_pedido_serial}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium whitespace-nowrap">{clienteNome}</TableCell>
                      <TableCell className="px-4 py-3 max-w-sm truncate" title={pedido.texto_roteiro || ''}>{pedido.texto_roteiro ? `${pedido.texto_roteiro.substring(0, 100)}...` : 'N/A'}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-semibold py-1 px-2.5 text-xs rounded-full",
                            pedido.status === 'pendente' && "text-status-orange border-status-orange bg-status-orange/10",
                            pedido.status === 'gravando' && "text-status-blue border-status-blue bg-status-blue/10",
                            pedido.status === 'concluido' && "text-status-green border-status-green bg-status-green/10",
                            pedido.status === 'cancelado' && "text-status-red border-status-red bg-status-red/10"
                          )}
                        >
                          {pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => handleOpenViewModal(pedido)}>
                          <Eye className="h-4 w-4 mr-1" /> Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground">Histórico de Pedidos (Concluídos e Cancelados)</h2>
        </div>
        <Separator className="my-4" />
        {isFetchFinalizedOrdersError && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            Erro ao carregar histórico de pedidos: {fetchFinalizedOrdersError?.message}
          </div>
        )}
        {isLoadingFinalizedOrders ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Carregando histórico de pedidos...</p>
          </div>
        ) : finalizedOrders.length === 0 && !isFetchFinalizedOrdersError ? (
          <div className="text-center py-10">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum Pedido no Histórico</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ainda não há pedidos concluídos ou cancelados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative border border-border rounded-md">
            <Table>
              <TableCaption className="py-3">Lista de pedidos com status 'concluído' ou 'cancelado'.</TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Nº Pedido</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"><CalendarDays className="inline-block mr-1 h-4 w-4"/>Data/Hora Pedido</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"><UserCircle className="inline-block mr-1 h-4 w-4"/>Cliente</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trecho do Roteiro</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Áudio</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {finalizedOrders.map((pedido) => {
                  const clienteNome = pedido.profile 
                                    ? pedido.profile.full_name || pedido.profile.username 
                                    : 'Usuário Desconhecido';
                  return (
                    <TableRow key={pedido.id} className="hover:bg-muted/50 odd:bg-muted/20">
                      <TableCell className="font-medium">{pedido.id_pedido_serial}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium whitespace-nowrap">{clienteNome}</TableCell>
                      <TableCell className="px-4 py-3 max-w-sm truncate" title={pedido.texto_roteiro || ''}>{pedido.texto_roteiro ? `${pedido.texto_roteiro.substring(0, 100)}...` : 'N/A'}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-semibold py-1 px-2.5 text-xs rounded-full",
                            pedido.status === 'concluido' && "text-status-green border-status-green bg-status-green/10",
                            pedido.status === 'cancelado' && "text-status-red border-status-red bg-status-red/10"
                          )}
                        >
                          {pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {pedido.audio_final_url ? (
                          <a
                            href={pedido.audio_final_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-status-green text-white rounded hover:bg-status-green/90 text-xs font-medium transition-colors"
                          >
                            <UploadCloud className="h-4 w-4 mr-1" /> Baixar
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {pedido.status === 'cancelado' ? (
                          <span className="text-xs text-status-red italic font-medium">Pedido Cancelado</span>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleOpenViewModal(pedido)}>
                            <Eye className="h-4 w-4 mr-1" /> Detalhes
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedPedido && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido: {selectedPedido.id_pedido_serial}</DialogTitle>
              <DialogDescription>
                Visualização completa das informações do pedido.
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

              <Separator />

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
    </div>
  );
}

export default AdminDashboardPage; 