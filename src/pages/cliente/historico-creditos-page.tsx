import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Clock, Circle, AlertTriangle, Undo2, UserCog } from 'lucide-react';

interface EventoTimeline {
  tipo: 'ADICAO_CREDITO' | 'USO_CREDITO' | 'EXPIRACAO_CREDITO' | 'ESTORNO_CREDITO' | 'AJUSTE_MANUAL';
  data: string;
  descricao: string;
  detalhes: string;
  saldoApos?: number;
  admin?: boolean;
}

const getIcon = (tipo: EventoTimeline['tipo']) => {
  if (tipo === 'ADICAO_CREDITO') return <PlusCircle className="h-5 w-5 text-green-500" />;
  if (tipo === 'USO_CREDITO') return <MinusCircle className="h-5 w-5 text-red-500" />;
  if (tipo === 'EXPIRACAO_CREDITO') return <Clock className="h-5 w-5 text-yellow-600" />;
  if (tipo === 'ESTORNO_CREDITO') return <Undo2 className="h-5 w-5 text-blue-600" />;
  if (tipo === 'AJUSTE_MANUAL') return <UserCog className="h-5 w-5 text-purple-600" />;
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
          .order('data_adicao', { ascending: true });
        if (lotesError) throw lotesError;
        const lotes = (lotesData || []).map((lote: any) => ({
          id: lote.id,
          quantidade_adicionada: lote.quantidade_adicionada,
          quantidade_usada: lote.quantidade_usada,
          data_adicao: lote.data_adicao,
          data_validade: lote.data_validade,
          observacao_admin: lote.observacao_admin,
        }));

        // 1a. Eventos de adição/ajuste manual
        lotes.forEach((lote) => {
          const isAjusteManual = lote.observacao_admin && /ajuste|erro|estorno|manual|correção|admin|subtra/i.test(lote.observacao_admin);
          const isNegativo = lote.quantidade_adicionada < 0;
          if (isAjusteManual || isNegativo) {
            eventos.push({
              tipo: 'AJUSTE_MANUAL',
              data: lote.data_adicao,
              descricao: `${lote.quantidade_adicionada > 0 ? '+' : ''}${lote.quantidade_adicionada} crédito${Math.abs(lote.quantidade_adicionada) === 1 ? '' : 's'} ${lote.quantidade_adicionada > 0 ? 'adicionados' : 'subtraídos'} pelo Atendimento`,
              detalhes: lote.observacao_admin || 'Ajuste manual',
              admin: true,
            });
          } else {
            eventos.push({
              tipo: 'ADICAO_CREDITO',
              data: lote.data_adicao,
              descricao: `+${lote.quantidade_adicionada} crédito${lote.quantidade_adicionada === 1 ? '' : 's'} adicionados`,
              detalhes: `${lote.data_validade ? `Validade: ${new Date(lote.data_validade).toLocaleDateString('pt-BR')}` : 'Sem prazo de validade.'}${lote.observacao_admin ? `\nMotivo: ${lote.observacao_admin}` : ''}`,
            });
          }
        });

        // 2. Buscar Pedidos (Uso de Créditos e Estorno)
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('id, id_pedido_serial, titulo, created_at, creditos_debitados, status, creditos_estornados')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (pedidosError) throw pedidosError;
        (pedidosData || []).forEach((pedido: any) => {
          // Uso de créditos
          if (pedido.creditos_debitados > 0 && !['cancelado', 'rejeitado'].includes(pedido.status)) {
            eventos.push({
              tipo: 'USO_CREDITO',
              data: pedido.created_at,
              descricao: `- ${pedido.creditos_debitados} crédito${pedido.creditos_debitados === 1 ? '' : 's'} usados no pedido #${pedido.id_pedido_serial || (pedido.id?.substring(0,8))}`,
              detalhes: `Pedido: ${pedido.titulo || 'Sem título'}`,
            });
          }
          // Estorno de créditos por cancelamento/rejeição
          if ((pedido.status === 'cancelado' || pedido.status === 'rejeitado') && pedido.creditos_estornados > 0) {
            eventos.push({
              tipo: 'ESTORNO_CREDITO',
              data: pedido.created_at,
              descricao: `+${pedido.creditos_estornados} crédito${pedido.creditos_estornados === 1 ? '' : 's'} estornados (pedido cancelado/rejeitado)`,
              detalhes: `Pedido #${pedido.id_pedido_serial || (pedido.id?.substring(0,8))} (${pedido.titulo || 'Sem título'})`,
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
                descricao: `- ${creditosNaoUsadosDoLote} crédito${creditosNaoUsadosDoLote === 1 ? '' : 's'} expiraram`,
                detalhes: `Do lote adicionado em ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}.`,
              });
            }
          }
        });

        // 4. Calcular saldo fiel ao backend para cada evento
        eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        // Buscar todos os lotes, pedidos e eventos relevantes já estão em memória
        // Para cada evento, calcular o saldo até aquele momento
        const calcularSaldoAteData = (dataEvento: string) => {
          // Lotes adicionados até a data do evento
          const lotesAteData = lotes.filter(lote => new Date(lote.data_adicao) <= new Date(dataEvento));
          const somaLotes = lotesAteData.reduce((acc, lote) => acc + lote.quantidade_adicionada, 0);
          // Créditos expirados até a data do evento
          const expirados = lotesAteData.filter(lote => lote.data_validade && new Date(lote.data_validade) <= new Date(dataEvento)).reduce((acc, lote) => acc + (lote.quantidade_adicionada - (lote.quantidade_usada || 0)), 0);
          // Usos de créditos até a data do evento
          const usos = (pedidosData || []).filter((pedido: any) => new Date(pedido.created_at) <= new Date(dataEvento) && pedido.creditos_debitados > 0 && !['cancelado', 'rejeitado'].includes(pedido.status)).reduce((acc, pedido) => acc + pedido.creditos_debitados, 0);
          // Estornos até a data do evento
          const estornos = (pedidosData || []).filter((pedido: any) => new Date(pedido.created_at) <= new Date(dataEvento) && (pedido.status === 'cancelado' || pedido.status === 'rejeitado') && pedido.creditos_estornados > 0).reduce((acc, pedido) => acc + pedido.creditos_estornados, 0);
          let saldo = somaLotes - expirados - usos + estornos;
          if (saldo < 0) saldo = 0;
          return saldo;
        };
        eventos.forEach((evento) => {
          evento.saldoApos = calcularSaldoAteData(evento.data);
        });
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
    <div className="min-h-screen bg-background text-foreground max-w-2xl mx-auto py-8 px-2 md:px-0">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Histórico de Créditos</h1>
      {/* Card de saldo real */}
      <Card className="mb-6 p-4 flex flex-col items-center bg-card text-card-foreground border-2 border-amber-500">
        <div className="text-lg font-semibold text-amber-900 dark:text-blue-200">Saldo atual</div>
        <div className="text-3xl font-bold text-amber-700 dark:text-blue-300">{profile?.saldoCalculadoCreditos ?? 0} crédito{profile?.saldoCalculadoCreditos === 1 ? '' : 's'}</div>
      </Card>
      {/* Aviso de divergência */}
      {false && (
        <div className="mb-6 flex items-center gap-2 p-3 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 text-yellow-900 dark:text-yellow-200">
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
              const isAjusteManual = evento.tipo === 'AJUSTE_MANUAL' || evento.admin;
              return (
                <li key={`${evento.tipo}-${evento.data}-${idx}`} className="mb-6 ml-2 relative">
                  <span className={`absolute -left-6 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-background
                    ${evento.tipo === 'ADICAO_CREDITO' ? 'bg-green-100 dark:bg-green-900' :
                      evento.tipo === 'USO_CREDITO' ? 'bg-red-100 dark:bg-red-900' :
                      evento.tipo === 'EXPIRACAO_CREDITO' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      evento.tipo === 'ESTORNO_CREDITO' ? 'bg-blue-100 dark:bg-blue-900' :
                      isAjusteManual ? 'bg-purple-100 dark:bg-purple-900' :
                      'bg-background'}`}> 
                    {getIcon(evento.tipo)}
                  </span>
                  <Card className={`p-4 border shadow-sm bg-card text-card-foreground
                    ${evento.tipo === 'ADICAO_CREDITO' ? 'border-green-400' :
                      evento.tipo === 'USO_CREDITO' ? 'border-red-400' :
                      evento.tipo === 'EXPIRACAO_CREDITO' ? 'border-yellow-400' :
                      evento.tipo === 'ESTORNO_CREDITO' ? 'border-amber-400' :
                      isAjusteManual ? 'border-purple-400' :
                      ''}
                    ${isAjusteManual ? 'bg-purple-50 dark:bg-purple-900/30' : ''}
                  `}>
                    <div className="mb-1 flex items-center justify-between">
                      <time className="text-sm font-normal leading-none text-muted-foreground">
                        {new Date(evento.data).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {isAjusteManual && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-purple-200 text-purple-900 text-xs font-bold dark:bg-purple-700 dark:text-purple-100">Atendimento</span>
                      )}
                      {evento.tipo === 'ESTORNO_CREDITO' && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-xs font-bold dark:bg-blue-700 dark:text-blue-100">Estorno</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{evento.descricao}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{evento.detalhes}</p>
                    {typeof evento.saldoApos === 'number' && (
                      <div className="mt-2 text-sm font-semibold text-amber-700 dark:text-blue-400">
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