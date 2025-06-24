import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PlusCircle, Wallet, Sparkles, AlertTriangle, Package, MinusCircle } from 'lucide-react';

interface TimelineEvent {
  tipo: 'LOTE_ADICIONADO' | 'PEDIDO_CRIADO';
  data: string;
  descricao: string;
  detalhes: string;
  valor: number;
  saldoIA?: boolean; // Para diferenciar o tipo de crédito no ícone
}

const getIcon = (evento: TimelineEvent) => {
  if (evento.tipo === 'LOTE_ADICIONADO') {
    if (evento.saldoIA) return <Sparkles className="h-5 w-5 text-amber-500" />;
    return <Wallet className="h-5 w-5 text-sky-500" />;
  }
  if (evento.tipo === 'PEDIDO_CRIADO') {
    return <MinusCircle className="h-5 w-5 text-red-500" />;
  }
  return <PlusCircle className="h-5 w-5 text-green-500" />;
};

const HistoricoCreditosPage: React.FC = () => {
  const { profile, isLoading } = useAuth();
  const [eventos, setEventos] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorico = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 1. Buscar Lotes Adicionados
        const { data: lotesData, error: lotesError } = await supabase
          .from('lotes_creditos')
          .select('data_adicao, observacao_admin, creditos_gravacao_adicionados, creditos_ia_adicionados')
          .eq('user_id', profile.id)
          .order('data_adicao', { ascending: false });

        if (lotesError) throw lotesError;

        const eventosLotes: TimelineEvent[] = lotesData
          .flatMap(lote => {
            const eventosDoLote: TimelineEvent[] = [];
            let desc = lote.observacao_admin || 'Créditos adicionados';
            if (desc.startsWith('Ajuste manual de admin: ')) {
                desc = desc.substring('Ajuste manual de admin: '.length);
            } else if (desc.startsWith('Compra aprovada do pacote: ')) {
                desc = `Compra: Pacote ${desc.substring('Compra aprovada do pacote: '.length)}`;
            }

            if (lote.creditos_gravacao_adicionados > 0) {
              eventosDoLote.push({
                tipo: 'LOTE_ADICIONADO',
                data: lote.data_adicao,
                descricao: desc,
                detalhes: `+${lote.creditos_gravacao_adicionados.toLocaleString('pt-BR')} créditos de gravação.`,
                valor: lote.creditos_gravacao_adicionados,
                saldoIA: false
              });
            }
            if (lote.creditos_ia_adicionados > 0) {
              eventosDoLote.push({
                tipo: 'LOTE_ADICIONADO',
                data: lote.data_adicao,
                descricao: desc,
                detalhes: `+${lote.creditos_ia_adicionados.toLocaleString('pt-BR')} créditos de IA.`,
                valor: lote.creditos_ia_adicionados,
                saldoIA: true
              });
            }
            return eventosDoLote;
          });

        // 2. Buscar Pedidos (Débitos)
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('created_at, titulo, creditos_debitados, id_pedido_serial')
          .eq('user_id', profile.id)
          .gt('creditos_debitados', 0);

        if (pedidosError) throw pedidosError;
        
        const eventosPedidos: TimelineEvent[] = pedidosData.map(pedido => ({
            tipo: 'PEDIDO_CRIADO',
            data: pedido.created_at,
            descricao: `Pedido #${pedido.id_pedido_serial || ''}`,
            detalhes: `-${pedido.creditos_debitados.toLocaleString('pt-BR')} créditos de gravação para: "${pedido.titulo || 'Pedido sem título'}"`,
            valor: pedido.creditos_debitados,
        }));
        
        // 3. Mesclar e Ordenar
        const todosEventos = [...eventosLotes, ...eventosPedidos];
        todosEventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        setEventos(todosEventos);

      } catch (error) {
        console.error('Erro ao buscar histórico de créditos:', error);
        toast.error('Erro ao carregar histórico', { description: 'Não foi possível buscar seu histórico de movimentações.' });
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id) {
      fetchHistorico();
    }
  }, [profile?.id]);

  return (
    <div className="min-h-screen bg-background text-foreground max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-foreground">Histórico de Créditos</h1>
      
      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 flex flex-col justify-between bg-card text-card-foreground border-none shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-muted-foreground">Saldo Gravação</h3>
              <Wallet className="h-6 w-6 text-sky-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <p className="text-4xl font-bold text-foreground">{profile?.saldo_gravacao?.toLocaleString('pt-BR') ?? 0}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Créditos para locução humana.</p>
        </Card>
        <Card className="p-6 flex flex-col justify-between bg-card text-card-foreground border-none shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-muted-foreground">Saldo IA</h3>
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <p className="text-4xl font-bold text-foreground">{profile?.saldo_ia?.toLocaleString('pt-BR') ?? 0}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Créditos para geração por Inteligência Artificial.</p>
        </Card>
      </div>

      <Separator className="my-8" />
      
      <h2 className="text-xl font-semibold mb-6">Movimentações</h2>
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : eventos.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p>Nenhuma movimentação de crédito encontrada.</p>
          <p className="text-sm">Suas compras de pacotes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-border/50 pl-8 space-y-10">
          {eventos.map((evento, idx) => (
            <div key={`${evento.tipo}-${evento.data}-${idx}`} className="relative">
              <div className="absolute -left-8 -translate-x-1/2 top-1 w-5 h-5 bg-background border-2 border-current rounded-full flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-current" />
              </div>
              <Card className="p-4 border-none shadow-sm bg-card text-card-foreground">
                <div className="flex items-start gap-4">
                   <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-1">
                    {getIcon(evento)}
                   </div>
                   <div className="flex-1">
                      <p className="font-semibold text-foreground text-base">{evento.descricao}</p>
                      <p className="text-sm text-muted-foreground">{evento.detalhes}</p>
                      <time className="text-xs text-muted-foreground/80 mt-1 block">
                        {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                   </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoricoCreditosPage; 