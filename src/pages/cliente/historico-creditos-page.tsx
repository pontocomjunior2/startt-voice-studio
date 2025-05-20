import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Clock, Circle, AlertTriangle } from 'lucide-react';

interface EventoTimeline {
  tipo: 'ADICAO_CREDITO' | 'USO_CREDITO' | 'EXPIRACAO_CREDITO';
  data: string;
  descricao: string;
  detalhes: string;
  saldoApos?: number;
}

const getIcon = (tipo: EventoTimeline['tipo']) => {
  if (tipo === 'ADICAO_CREDITO') return <PlusCircle className="h-5 w-5 text-green-500" />;
  if (tipo === 'USO_CREDITO') return <MinusCircle className="h-5 w-5 text-red-500" />;
  if (tipo === 'EXPIRACAO_CREDITO') return <Clock className="h-5 w-5 text-yellow-600" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
};

const HistoricoCreditosPage: React.FC = () => {
  const { profile } = useAuth();
  const [eventosTimeline, setEventosTimeline] = useState<EventoTimeline[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    const fetchEventosTimeline = async () => {
      if (!profile?.id) return;
      setLoadingTimeline(true);
      try {
        const userId = profile.id;
        let eventos: EventoTimeline[] = [];

        // Buscar todos os lotes para simulação do saldo
        const { data: lotesData, error: lotesError } = await supabase
          .from('lotes_creditos')
          .select('id, quantidade_adicionada, quantidade_usada, data_adicao, data_validade, observacao_admin')
          .eq('user_id', userId)
          .order('data_adicao', { ascending: true }); // ASC para FIFO
        if (lotesError) throw lotesError;

        // Map de lotes para simulação
        const lotes = (lotesData || []).map((lote: any) => ({
          id: lote.id,
          quantidade_adicionada: lote.quantidade_adicionada,
          quantidade_usada: lote.quantidade_usada,
          data_adicao: lote.data_adicao,
          data_validade: lote.data_validade,
          observacao_admin: lote.observacao_admin,
        }));

        // 1. Eventos de adição de créditos
        lotes.forEach((lote) => {
          eventos.push({
            tipo: 'ADICAO_CREDITO',
            data: lote.data_adicao,
            descricao: `${lote.quantidade_adicionada} créditos adicionados.`,
            detalhes: lote.data_validade
              ? `Validade: ${new Date(lote.data_validade).toLocaleDateString('pt-BR')}`
              : 'Sem prazo de validade.' + (lote.observacao_admin ? ` Motivo: ${lote.observacao_admin}` : ''),
          });
        });

        // 2. Buscar Pedidos (Uso de Créditos)
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('id, id_pedido_serial, titulo, created_at, creditos_debitados, status')
          .eq('user_id', userId)
          .neq('status', 'cancelado')
          .neq('status', 'rejeitado')
          .order('created_at', { ascending: true }); // ASC para simulação
        if (pedidosError) throw pedidosError;
        (pedidosData || []).forEach((pedido: any) => {
          if (pedido.creditos_debitados > 0) {
            eventos.push({
              tipo: 'USO_CREDITO',
              data: pedido.created_at,
              descricao: `Pedido #${pedido.id_pedido_serial || (pedido.id?.substring(0,8))} (${pedido.titulo || 'Sem título'})`,
              detalhes: `- ${pedido.creditos_debitados} créditos`,
            });
          }
        });

        // 3. Lotes Expirados
        const nowIso = new Date().toISOString();
        lotes.forEach((lote) => {
          if (lote.data_validade && lote.data_validade < nowIso) {
            const creditosNaoUsadosDoLote = lote.quantidade_adicionada - (lote.quantidade_usada || 0);
            if (creditosNaoUsadosDoLote > 0) {
              eventos.push({
                tipo: 'EXPIRACAO_CREDITO',
                data: lote.data_validade,
                descricao: `${creditosNaoUsadosDoLote} créditos expiraram.`,
                detalhes: `Do lote adicionado em ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}.`,
              });
            }
          }
        });

        // 4. Calcular saldo após cada evento
        // Ordenar eventos por data ASC para simulação
        eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        let saldo = 0;
        eventos.forEach((evento) => {
          if (evento.tipo === 'ADICAO_CREDITO') {
            // Encontrar o lote correspondente
            const lote = lotes.find(l => l.data_adicao === evento.data);
            saldo += lote ? lote.quantidade_adicionada : 0;
          } else if (evento.tipo === 'USO_CREDITO') {
            // Extrair valor do texto
            const match = evento.detalhes.match(/-\s*(\d+)/);
            const valor = match ? parseInt(match[1], 10) : 0;
            saldo -= valor;
          } else if (evento.tipo === 'EXPIRACAO_CREDITO') {
            // Extrair valor do texto
            const match = evento.descricao.match(/(\d+)/);
            const valor = match ? parseInt(match[1], 10) : 0;
            saldo -= valor;
          }
          evento.saldoApos = saldo;
        });

        // Exibir do mais recente para o mais antigo
        eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setEventosTimeline(eventos);
      } catch (error: any) {
        console.error('Erro ao buscar histórico de créditos:', error);
        toast.error('Erro', { description: 'Não foi possível carregar o histórico.' });
      } finally {
        setLoadingTimeline(false);
      }
    };
    fetchEventosTimeline();
  }, [profile?.id]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-2 md:px-0">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Histórico de Créditos</h1>
      {/* Card de saldo real */}
      <Card className="mb-6 p-4 flex flex-col items-center border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <div className="text-lg font-semibold text-blue-900 dark:text-blue-200">Saldo atual</div>
        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{profile?.saldoCalculadoCreditos ?? 0} crédito{profile?.saldoCalculadoCreditos === 1 ? '' : 's'}</div>
      </Card>
      {/* Aviso de divergência */}
      {eventosTimeline.length > 0 && typeof eventosTimeline[0].saldoApos === 'number' && profile?.saldoCalculadoCreditos !== undefined && eventosTimeline[0].saldoApos !== profile.saldoCalculadoCreditos && (
        <div className="mb-6 flex items-center gap-2 p-3 rounded-md bg-yellow-100 border border-yellow-400 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span>
            O saldo real pode ser diferente do saldo simulado na timeline devido a ajustes manuais, estornos ou eventos não exibidos.
          </span>
        </div>
      )}
      <Separator className="mb-8" />
      {loadingTimeline ? (
        <div className="space-y-4">
          {[1,2,3,4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : eventosTimeline.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Nenhuma movimentação de créditos encontrada.</div>
      ) : (
        <div className="relative border-l border-gray-200 dark:border-gray-700 pl-6">
          <ol className="space-y-8">
            {eventosTimeline.map((evento, idx) => {
              // Destacar eventos de ajuste manual: lote negativo OU observacao_admin indicando ajuste/erro/estorno
              const isAjusteManual = evento.tipo === 'ADICAO_CREDITO' && (
                evento.descricao.includes('-') ||
                /ajuste|erro|estorno|manual|correção/i.test(evento.detalhes)
              );
              return (
                <li key={`${evento.tipo}-${evento.data}-${idx}`} className="mb-6 ml-2 relative">
                  <span className={`absolute -left-6 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-background ${isAjusteManual ? 'bg-yellow-200 dark:bg-yellow-700' : 'bg-background'}`}> 
                    {getIcon(evento.tipo)}
                  </span>
                  <Card className={`p-4 border shadow-sm ${isAjusteManual ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' : ''}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <time className="text-sm font-normal leading-none text-muted-foreground">
                        {new Date(evento.data).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {isAjusteManual && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-bold dark:bg-yellow-700 dark:text-yellow-100">Ajuste Manual</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{evento.descricao}</h3>
                    <p className="text-sm text-muted-foreground">{evento.detalhes}</p>
                    {typeof evento.saldoApos === 'number' && (
                      <div className="mt-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                        Saldo após este evento: {evento.saldoApos} crédito{evento.saldoApos === 1 ? '' : 's'}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};

export default HistoricoCreditosPage; 