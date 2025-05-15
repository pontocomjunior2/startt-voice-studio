import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar caminho se necessário
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Card pode ser útil para a mensagem de "nenhum pedido"
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient'; // Ajustar caminho se necessário
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loader2, ListMusic, PlusCircle, DownloadCloud, AlertTriangle, RefreshCw, Edit3, History } from 'lucide-react'; // Ícones necessários, Edit3 ou History para revisão
import { useNavigate, Link } from 'react-router-dom'; // Link para o botão de novo pedido
import { solicitarRevisaoAction } from '@/actions/pedido-actions'; // Importar a action
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send } from "lucide-react"
import { PEDIDO_STATUS } from '@/types/pedido.type'; // Importar valor normalmente
import type { Pedido, TipoStatusPedido } from '@/types/pedido.type'; // Importar tipos com type

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
          locutores ( nome )
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

      const mappedPedidos: Pedido[] = (data || []).map((pedido: any) => ({
        ...pedido,
        locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
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

  const handleDownload = async (pedido: Pedido) => {
    if (!pedido.audio_final_url) {
      toast.error("Download Indisponível", { description: "O áudio para este pedido ainda não está pronto ou não foi encontrado." });
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = pedido.audio_final_url;
      const fileName = pedido.audio_final_url.substring(pedido.audio_final_url.lastIndexOf('/') + 1) || 'audio_pedido_' + pedido.id;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download Iniciado", { description: "O áudio está sendo baixado." });
      if (!pedido.downloaded_at) {
        const { error } = await supabase
          .from('pedidos')
          .update({ downloaded_at: new Date().toISOString() })
          .eq('id', pedido.id);
        if (error) {
          console.warn("Não foi possível marcar o pedido como baixado:", error);
        } else {
          setPedidos(prev => prev.map(p => p.id === pedido.id ? {...p, downloaded_at: new Date().toISOString()} : p));
        }
      }
    } catch (error) {
      console.error("Erro ao tentar baixar o áudio:", error);
      toast.error("Erro no Download", { description: "Não foi possível iniciar o download do áudio." });
    }
  };

  const handleOpenRevisaoModal = (pedido: Pedido) => {
    setPedidoParaRevisao(pedido);
    setDescricaoRevisao(""); // Limpar descrição anterior
    setIsRevisaoModalOpen(true);
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
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Créditos</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {pedidos.map((pedido) => {
                // Log para verificar o status no momento da renderização
                console.log(`[Render Tabela] Pedido ID: ${pedido.id_pedido_serial}, Status: ${pedido.status}`);
                return (
                  <TableRow key={pedido.id} className="hover:bg-muted/10 odd:bg-card even:bg-muted/5 transition-colors">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{pedido.id_pedido_serial}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium whitespace-nowrap text-sm text-foreground">
                      {pedido.locutores?.nome || <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell className="px-6 py-3 max-w-md text-sm text-muted-foreground">
                      <p className="truncate" title={pedido.titulo || 'Título não disponível'}>
                        {pedido.titulo || <span className="italic">Título não disponível</span>}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Badge 
                        variant={
                          pedido.status === PEDIDO_STATUS.CONCLUIDO ? 'outline' : // Mapeado para 'outline' (era 'success')
                          pedido.status === PEDIDO_STATUS.PENDENTE ? 'default' :
                          pedido.status === PEDIDO_STATUS.GRAVANDO ? 'secondary' : // Mapeado para 'secondary' (era 'warning')
                          pedido.status === PEDIDO_STATUS.EM_REVISAO ? 'outline' : // Mapeado para 'outline' (era 'info')
                          pedido.status === PEDIDO_STATUS.CANCELADO ? 'destructive' :
                          'secondary' // Fallback
                        }
                        className="whitespace-nowrap"
                      >
                        {/* O texto do Badge pode permanecer o mesmo */}
                        {pedido.status === PEDIDO_STATUS.EM_REVISAO ? 'Em Revisão' : pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-foreground">
                      {pedido.creditos_debitados}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {pedido.status === PEDIDO_STATUS.CONCLUIDO && ( // <<< Use PEDIDO_STATUS
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(pedido)}
                          className="flex items-center"
                          disabled={!pedido.audio_final_url}
                        >
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          Baixar Áudio {pedido.downloaded_at ? '(Baixado)' : ''}
                        </Button>
                      )}
                      {/* Botão para solicitar revisão */}
                      {pedido.status === PEDIDO_STATUS.CONCLUIDO && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRevisaoModal(pedido)}
                          disabled={loadingRevisao === pedido.id || pedido.status !== PEDIDO_STATUS.CONCLUIDO}
                          className={cn(
                            "flex items-center",
                            pedido.status !== PEDIDO_STATUS.CONCLUIDO && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {loadingRevisao === pedido.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Edit3 className="mr-2 h-4 w-4" />
                          )}
                          Solicitar Revisão
                        </Button>
                      )}
                      {/* Se estiver em revisão, mostrar o status e ainda permitir baixar o original */}
                      {pedido.status === PEDIDO_STATUS.EM_REVISAO && pedido.audio_final_url && (
                         <>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="mr-2 opacity-70" // Deixar um pouco diferente para indicar que é o antigo
                            onClick={() => handleDownload(pedido)}
                            aria-label="Baixar áudio original (em revisão)"
                          >
                            <DownloadCloud className="mr-1.5 h-4 w-4" /> Baixar Original
                          </Button>
                          {/* Aqui podemos adicionar um futuro botão "Ver Versões Revisadas" */}
                        </>
                      )}
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
    </div>
  );
}

export default MeusAudiosPage; 