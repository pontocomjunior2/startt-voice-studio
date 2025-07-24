import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, RefreshCw, PlusCircle, Wallet,
  Hourglass, CheckCircle2, User, Sparkles, ListMusic
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useFetchClientDashboardStats } from '@/hooks/queries/use-fetch-client-dashboard-stats.hook';
import { useFetchClientOrders } from '@/hooks/queries/use-fetch-client-orders.hook';
import { useFetchDashboardSections } from '@/hooks/queries/use-fetch-dashboard-sections.hook';

// Tipos para o dashboard

function DashboardPage() {
  const { user, profile, isLoading, isFetchingProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useFetchClientDashboardStats();
  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useFetchClientOrders();
  const { data: sectionsData, isLoading: loadingSecoesDashboard, refetch: refetchSections } = useFetchDashboardSections();

  const ultimosPedidos = sectionsData?.ultimosPedidos || [];
  const locutoresFavoritosExibicao = sectionsData?.locutoresFavoritos || [];

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshProfile?.(),
      refetchStats(),
      refetchPedidos(),
      refetchSections(),
    ]);
  };

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
            onClick={handleRefreshAll}
            disabled={isFetchingProfile || loadingStats || loadingPedidos || loadingSecoesDashboard}
            aria-label="Atualizar painel"
          >
            <RefreshCw className={cn("h-4 w-4", (isFetchingProfile || loadingStats || loadingPedidos || loadingSecoesDashboard) && "animate-spin")} />
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
              <CardTitle className="text-sm font-medium">Pendentes / Em Andamento</CardTitle>
              <Hourglass className="h-5 w-5 text-startt-blue" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{stats?.pedidosPendentes ?? 0}</div>}
              <p className="text-xs text-muted-foreground">Aguardando ou em produção.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg bg-card text-card-foreground border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-startt-purple" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold bg-gradient-to-r from-startt-blue to-startt-purple bg-clip-text text-transparent">{stats?.pedidosConcluidos ?? 0}</div>}
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