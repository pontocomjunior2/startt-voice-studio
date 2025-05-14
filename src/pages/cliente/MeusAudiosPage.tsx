import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar caminho se necessário
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Card pode ser útil para a mensagem de "nenhum pedido"
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient'; // Ajustar caminho se necessário
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Loader2, ListMusic, PlusCircle, DownloadCloud, AlertTriangle } from 'lucide-react'; // Ícones necessários
import { useNavigate, Link } from 'react-router-dom'; // Link para o botão de novo pedido

// Definir um tipo para Pedido (copiado da DashboardPage)
interface Pedido {
  id: string;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado';
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome: string } | null;
}

function MeusAudiosPage() {
  const { user, profile, refreshNotifications } = useAuth(); // Apenas o necessário
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [errorLoadingPedidos, setErrorLoadingPedidos] = useState<string | null>(null);

  // Função para buscar todos os pedidos do cliente (adaptada da DashboardPage)
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
          created_at,
          texto_roteiro,
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
        throw error; // Re-throw para ser pego pelo catch externo se necessário
      }
      
      const mappedPedidos: Pedido[] = (data || []).map((pedido: any) => ({
        ...pedido,
        locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
      }));
      setPedidos(mappedPedidos);

      // Marcar pedidos como notificados/visualizados (lógica mantida, pode ser opcional aqui)
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
            refreshNotifications(); // Atualiza a contagem de notificações no AuthContext
          }
        }
      }

    } catch (err: any) {
      // O erro já foi setado no estado, apenas log adicional se necessário
      console.error('Erro no bloco try/catch ao buscar todos os pedidos:', err);
      if (!errorLoadingPedidos) { // Se não foi setado por um erro específico do Supabase
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

  // Função de download (copiada da DashboardPage)
  const handleDownload = async (pedido: Pedido) => {
    if (!pedido.audio_final_url) {
      toast.error("Download Indisponível", { description: "O áudio para este pedido ainda não está pronto ou não foi encontrado." });
      return;
    }
    try {
      // Criar um link temporário
      const link = document.createElement('a');
      link.href = pedido.audio_final_url;

      // Extrair o nome do arquivo da URL ou usar um nome padrão
      // Isso é uma tentativa básica. O ideal seria ter o nome do arquivo vindo do backend.
      const fileName = pedido.audio_final_url.substring(pedido.audio_final_url.lastIndexOf('/') + 1) || 'audio_pedido_' + pedido.id;
      link.setAttribute('download', fileName); // Força o download com um nome de arquivo

      // Adicionar o link ao corpo, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // window.open(pedido.audio_final_url, '_blank'); // Linha original comentada
      toast.success("Download Iniciado", { description: "O áudio está sendo baixado." });
      
      // Opcional: Marcar como baixado e atualizar UI localmente
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
        <Button onClick={() => navigate('/gravar-locucao')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Fazer Novo Pedido
        </Button>
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
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Data</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Locutor</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[250px]">Trecho do Roteiro</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Créditos</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {pedidos.map((pedido) => {
                return (
                  <TableRow key={pedido.id} className="hover:bg-muted/10 odd:bg-card even:bg-muted/5 transition-colors">
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
                      <p className="truncate" title={pedido.texto_roteiro}>
                        {pedido.texto_roteiro ? `${pedido.texto_roteiro.substring(0, 100)}${pedido.texto_roteiro.length > 100 ? '...':''}` : <span className="italic">Roteiro não disponível</span>}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
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
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-foreground">
                      {pedido.creditos_debitados}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {pedido.status === 'cancelado' ? (
                        <span className="text-xs text-status-red italic font-medium">Pedido Cancelado</span>
                      ) : pedido.status === 'concluido' && pedido.audio_final_url ? (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleDownload(pedido)} 
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <DownloadCloud className="mr-1.5 h-4 w-4" />
                          Baixar Áudio
                        </Button>
                      ) : pedido.status === 'concluido' && !pedido.audio_final_url ? (
                        <span className="text-xs text-muted-foreground italic">Áudio em breve...</span>
                      ) : (
                        <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                          Aguardando
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
  );
}

export default MeusAudiosPage; 