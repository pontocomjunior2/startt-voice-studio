import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from '../lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, RefreshCw, PlusCircle, Wallet, ClipboardList, 
  Hourglass, CheckCircle2, ListMusic, User, Sparkles
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Definir um tipo para Pedido
interface Pedido {
  id: string;
  id_pedido_serial: number;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'em_revisao' | 'aguardando_cliente' | 'rejeitado';
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome_artistico: string } | null;
  titulo?: string;
}

// Tipo específico para os últimos pedidos exibidos no dashboard
interface UltimoPedidoItem {
  id: string;
  titulo?: string | null;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'em_revisao' | 'aguardando_cliente' | 'rejeitado';
  created_at: string;
  locutores: { nome_artistico: string } | null;
}

// Definir um tipo para Locutor (para exibição de favoritos)
interface LocutorExibicao {
  id: string;
  nome_artistico: string;
  avatar_url?: string | null;
  bio?: string | null;
}

function DashboardPage() {
  const { user, profile, isLoading, isFetchingProfile, refreshProfile, refreshNotifications } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Stats do Dashboard
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [pedidosPendentes, setPedidosPendentes] = useState(0);
  const [pedidosConcluidos, setPedidosConcluidos] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Novos estados para seções adicionais
  const [ultimosPedidos, setUltimosPedidos] = useState<UltimoPedidoItem[]>([]);
  const [locutoresFavoritosExibicao, setLocutoresFavoritosExibicao] = useState<LocutorExibicao[]>([]);
  const [loadingSecoesDashboard, setLoadingSecoesDashboard] = useState(true);

  const fetchClientDashboardStats = async () => {
    if (!profile?.id) return;
    setLoadingStats(true);
    try {
      const { count: totalCount, error: totalError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      if (totalError) { console.error(totalError); throw totalError; }
      setTotalPedidos(totalCount ?? 0);

      const { count: pendentesCount, error: pendentesError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .in('status', ['pendente', 'gravando', 'em_producao', 'em_analise']);
      if (pendentesError) { console.error(pendentesError); throw pendentesError; }
      setPedidosPendentes(pendentesCount ?? 0);

      const { count: concluidosCount, error: concluidosError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'concluido');
      if (concluidosError) { console.error(concluidosError); throw concluidosError; }
      setPedidosConcluidos(concluidosCount ?? 0);

    } catch (error: any) {
      console.error("Erro ao buscar estatísticas do cliente:", error);
      toast.error("Erro ao Carregar Estatísticas", { description: error.message || "Não foi possível carregar os dados do seu painel." });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchPedidos = async () => {
    if (!profile?.id) return;
    setLoadingPedidos(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          id_pedido_serial,
          created_at,
          texto_roteiro,
          creditos_debitados,
          status,
          audio_final_url,
          downloaded_at,
          cliente_notificado_em,
          locutores ( nome_artistico ) 
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) { console.error(error); throw error; }
      
      const mappedPedidos: Pedido[] = (data || []).map((pedido: any) => ({
        ...pedido,
        locutores: Array.isArray(pedido.locutores) ? pedido.locutores[0] : pedido.locutores,
      }));
      setPedidos(mappedPedidos);

      if (mappedPedidos && mappedPedidos.length > 0) {
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
            console.error("DashboardPage: Erro ao marcar pedidos como notificados:", updateError);
          } else if (refreshNotifications) {
            setTimeout(() => { refreshNotifications(); }, 1000);
          }
        }
      }

    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      toast.error("Erro ao Carregar Histórico", { description: err.message || "Não foi possível carregar seus pedidos." });
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Função refatorada para buscar dados das novas seções
  const fetchDadosAdicionaisDashboard = useCallback(async () => {
    if (!profile?.id) return;

    setLoadingSecoesDashboard(true);
    try {
      // 1. Buscar Últimos Pedidos (ex: 3 mais recentes)
      const { data: pedidosDataRaw, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id,
          titulo,
          status,
          created_at,
          locutores ( nome_artistico )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (pedidosError) throw pedidosError;
      
      const mappedUltimosPedidos: UltimoPedidoItem[] = (pedidosDataRaw || []).map((pedido: any) => {
        console.log('[DashboardPage] Último Pedido Raw - ID:', pedido.id, 'Título:', pedido.titulo, 'Locutores Raw:', pedido.locutores);
        const locutorProcessado = Array.isArray(pedido.locutores) && pedido.locutores.length > 0 
                                    ? pedido.locutores[0] 
                                    : (pedido.locutores && typeof pedido.locutores === 'object' && pedido.locutores !== null && 'nome_artistico' in pedido.locutores ? pedido.locutores : null);
        
        console.log('[DashboardPage] Último Pedido Mapeado - ID:', pedido.id, 'Título:', pedido.titulo, 'Locutor Processado:', locutorProcessado);
        return {
          ...pedido,
          locutores: locutorProcessado,
        };
      });
      setUltimosPedidos(mappedUltimosPedidos);

      // 2. Buscar Locutores Favoritos e seus detalhes
      const { data: favoritosIdsData, error: favoritosIdsError } = await supabase
        .from('locutores_favoritos')
        .select('locutor_id')
        .eq('user_id', profile.id);

      if (favoritosIdsError) throw favoritosIdsError;

      if (favoritosIdsData && favoritosIdsData.length > 0) {
        const ids = favoritosIdsData.map(f => f.locutor_id);
        const { data: locutoresData, error: locutoresError } = await supabase
          .from('locutores')
          .select('id, nome_artistico, avatar_url, bio')
          .in('id', ids)
          .limit(3); 

        if (locutoresError) throw locutoresError;
        setLocutoresFavoritosExibicao(locutoresData || []);
      } else {
        setLocutoresFavoritosExibicao([]);
      }

    } catch (error: any) {
      console.error("Erro ao buscar dados adicionais para o dashboard:", error);
      toast.error("Erro ao Carregar Seções", { description: error.message || "Não foi possível carregar todas as informações do painel." });
    } finally {
      setLoadingSecoesDashboard(false);
    }
  }, [profile?.id, supabase]); // Dependências do useCallback

  useEffect(() => {
    if (profile?.id) {
      fetchPedidos();
      fetchClientDashboardStats();
      fetchDadosAdicionaisDashboard(); // Chamar a função refatorada
    }
  }, [profile?.id, fetchDadosAdicionaisDashboard]); // Adicionar fetchDadosAdicionaisDashboard às dependências

  if (isLoading || isFetchingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Redirecionando para o login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-10 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meu Painel</h1>
          <p className="text-sm text-muted-foreground">Explore seu painel, gerencie seus áudios e pedidos.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={async () => {
              await refreshProfile?.();
              fetchPedidos();
              fetchClientDashboardStats();
              fetchDadosAdicionaisDashboard(); // Chamar a função refatorada
            }}
            disabled={loadingPedidos || loadingStats || isFetchingProfile || loadingSecoesDashboard}
            aria-label="Atualizar painel"
          >
            <RefreshCw className={cn("h-4 w-4", (loadingPedidos || loadingStats || isFetchingProfile || loadingSecoesDashboard) && "animate-spin")} />
          </Button>
          <Button onClick={() => navigate('/gravar-locucao')} className="bg-gradient-to-r from-startt-blue to-startt-purple text-white hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Áudio
          </Button>
        </div>
      </div>

      <section id="estatisticas-cliente" className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Créditos de Gravação */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos de Gravação</CardTitle>
              <Wallet className="h-5 w-5 text-sky-500" />
            </CardHeader>
            <CardContent>
              {isLoading || isFetchingProfile ? (
                <Skeleton className="h-8 w-3/4 mb-1" />
              ) : (
                <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{profile?.saldo_gravacao?.toLocaleString('pt-BR') ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Disponíveis para voz humana.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="link" className="p-0 text-xs text-startt-blue hover:text-startt-purple" asChild>
                <Link to="/comprar-creditos">Comprar mais</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Card Créditos de IA */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos de IA</CardTitle>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading || isFetchingProfile ? (
                <Skeleton className="h-8 w-3/4 mb-1" />
              ) : (
                <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{profile?.saldo_ia?.toLocaleString('pt-BR') ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Para geração com Inteligência Artificial.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="link" className="p-0 text-xs text-startt-blue hover:text-startt-purple" asChild>
                <Link to="/comprar-creditos">Comprar mais</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <ClipboardList className="h-5 w-5 text-startt-purple" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{totalPedidos}</div>}
              <p className="text-xs text-muted-foreground">Pedidos realizados.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes / Em Andamento</CardTitle>
              <Hourglass className="h-5 w-5 text-startt-blue" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{pedidosPendentes}</div>}
              <p className="text-xs text-muted-foreground">Aguardando ou em produção.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-startt-purple" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{pedidosConcluidos}</div>}
              <p className="text-xs text-muted-foreground">Prontos para download.</p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <Separator className="my-8" />

      {/* Novas Seções: Últimos Pedidos e Locutores Favoritos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"> {/* Coluna maior para Últimos Pedidos */}
          <section id="ultimos-pedidos">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Últimos Pedidos</h3>
            {loadingSecoesDashboard ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : ultimosPedidos.length > 0 ? (
              <div className="space-y-3">
                {ultimosPedidos.map((pedido) => (
                  <Card key={pedido.id} className="p-4 hover:shadow-lg transition-shadow rounded-lg bg-card text-card-foreground border-none">
                    <Link to={`/meus-audios#pedido-${pedido.id}`} className="block">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent truncate max-w-xs sm:max-w-sm md:max-w-md">
                            {pedido.titulo || `Pedido de ${new Date(pedido.created_at).toLocaleDateString('pt-BR')}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Locutor: {pedido.locutores?.nome_artistico || 'N/A'}
                          </p>
                        </div>
                        <Badge variant={
                          pedido.status === 'concluido' ? 'default' :
                          pedido.status === 'em_revisao' || pedido.status === 'aguardando_cliente' ? 'outline' :
                          pedido.status === 'cancelado' || pedido.status === 'rejeitado' ? 'destructive' :
                          'secondary' // para pendente, gravando, etc.
                        }
                        className="whitespace-nowrap"
                        >
                          {pedido.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                    </Link>
                  </Card>
                ))}
                {pedidos.length > 3 && (
                  <div className="text-center mt-4">
                    <Button variant="link" asChild className="text-white hover:text-gray-200 underline">
                      <Link to="/meus-audios">Ver todos os meus pedidos</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-6 flex flex-col items-center justify-center text-center rounded-lg bg-card text-card-foreground border-none">
                 <ListMusic className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">Você ainda não realizou nenhum pedido.</p>
                <Button onClick={() => navigate('/gravar-locucao')} size="sm">Criar Novo Áudio</Button>
              </Card>
            )}
          </section>
        </div>

        <div className="lg:col-span-1"> {/* Coluna menor para Locutores Favoritos */}
          <section id="locutores-favoritos">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Meus Locutores Favoritos</h3>
            {loadingSecoesDashboard ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : locutoresFavoritosExibicao.length > 0 ? (
              <div className="space-y-3">
                {locutoresFavoritosExibicao.map((locutor) => (
                  <Card key={locutor.id} className="p-3 hover:shadow-lg transition-shadow rounded-lg bg-card text-card-foreground border-none">
                    <Link to={`/gravar-locucao?locutorId=${locutor.id}`} className="flex items-center space-x-3 group">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={locutor.avatar_url || undefined} alt={locutor.nome_artistico} />
                        <AvatarFallback>{locutor.nome_artistico?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent group-hover:text-amber-400 dark:group-hover:text-amber-300">{locutor.nome_artistico}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {locutor.bio || "Locutor Profissional"}
                        </p>
                      </div>
                    </Link>
                  </Card>
                ))}
                 <div className="text-center mt-4">
                    <Button variant="link" asChild className="text-white hover:text-gray-200 underline">
                        <Link to="/locutores">Explorar todos os locutores</Link>
                    </Button>
                </div>
              </div>
            ) : (
              <Card className="p-6 flex flex-col items-center justify-center text-center rounded-lg bg-card text-card-foreground border-none">
                <User className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">Você ainda não favoritou locutores.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/locutores">Explorar agora</Link>
                </Button>
              </Card>
            )}
          </section>
        </div>
      </div>

      <Separator className="my-8" />
    </div>
  );
}

export default DashboardPage; 