import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from '../lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, User, ListMusic, ClipboardList, Loader2, CheckCircle2, Hourglass, PlusCircle, RefreshCw } from 'lucide-react';
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Definir um tipo para Pedido
interface Pedido {
  id: string;
  id_pedido_serial: number;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: 'pendente' | 'gravando' | 'concluido' | 'cancelado';
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome: string } | null;
}

function DashboardPage() {
  const { signOut, user, profile, isLoading, isFetchingProfile, refreshProfile, refreshNotifications } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const location = useLocation();

  // Stats do Dashboard
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [pedidosPendentes, setPedidosPendentes] = useState(0);
  const [pedidosConcluidos, setPedidosConcluidos] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

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
        .in('status', ['pendente', 'gravando']);
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
          locutores ( nome ) 
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

  useEffect(() => {
    if (profile?.id) {
      fetchPedidos();
      fetchClientDashboardStats();
    }
  }, [profile?.id]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao Sair");
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location]);

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

  const userEmail = user.email;
  const userCredits = profile?.credits ?? 0;

  const handleDownload = async (pedido: Pedido) => {
    if (!pedido.audio_final_url) {
      toast.error("Download Indisponível");
      return;
    }
    try {
      window.open(pedido.audio_final_url, '_blank');
      toast.success("Download Iniciado");
      if (!pedido.downloaded_at) {
        await supabase.from('pedidos').update({ downloaded_at: new Date().toISOString() }).eq('id', pedido.id);
        setPedidos(prev => prev.map(p => p.id === pedido.id ? {...p, downloaded_at: new Date().toISOString()} : p));
      }
    } catch (error) {
      console.error("Erro ao baixar áudio:", error);
      toast.error("Erro no Download");
    }
  };

  return (
    <div className="space-y-10 p-4 md:p-6">
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
              await refreshProfile?.(); // Atualiza o perfil primeiro
              fetchPedidos(); 
              fetchClientDashboardStats();
            }}
            disabled={loadingPedidos || loadingStats || isFetchingProfile}
            aria-label="Atualizar painel"
          >
            <RefreshCw className={cn("h-4 w-4", (loadingPedidos || loadingStats || isFetchingProfile) && "animate-spin")} />
          </Button>
          <Button onClick={() => navigate('/gravar-locucao')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Locução
          </Button>
        </div>
      </div>

      <section id="estatisticas-cliente" className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meus Créditos</CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{userCredits.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">Disponíveis para usar.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <ClipboardList className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold text-foreground">{totalPedidos}</div>}
              <p className="text-xs text-muted-foreground">Pedidos realizados.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes / Em Andamento</CardTitle>
              <Hourglass className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold text-foreground">{pedidosPendentes}</div>}
              <p className="text-xs text-muted-foreground">Aguardando ou em produção.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold text-foreground">{pedidosConcluidos}</div>}
              <p className="text-xs text-muted-foreground">Prontos para download.</p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <Separator className="my-8" />

      <section id="meu-perfil-resumo" className="mb-12">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || user?.email || ''} />
                <AvatarFallback>{(profile?.full_name || user?.email || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{profile?.full_name || user?.email || 'Usuário'}</CardTitle>
                <CardDescription>Perfil de {profile?.role === 'cliente' ? 'Cliente' : profile?.role || 'Usuário'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Email: {userEmail}</p>
            {profile?.username && <p className="text-sm text-muted-foreground">Username: {profile.username}</p>}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
             <Button variant="outline" size="sm" onClick={() => navigate('/meu-perfil')}>Ver Perfil Completo</Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

export default DashboardPage; 