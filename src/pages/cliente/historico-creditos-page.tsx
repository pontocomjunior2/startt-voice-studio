import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Clock, Circle, AlertTriangle, Undo2, UserCog } from 'lucide-react';

interface EventoTimeline {
  tipo: 'ADICAO_CREDITO' | 'USO_CREDITO' | 'EXPIRACAO_CREDITO' | 'ESTORNO_CREDITO' | 'AJUSTE_MANUAL' | 'CREDITOS_VENCIDOS';
  data: string;
  descricao: string;
  detalhes: string;
  saldoApos?: number;
  admin?: boolean;
  diasVencidos?: number;
  creditosVencidos?: number;
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

        // Buscar todos os lotes de créditos do usuário
        const { data: lotesData, error: lotesError } = await supabase
          .from('lotes_creditos')
          .select('id, quantidade_adicionada, quantidade_usada, data_adicao, data_validade, observacao_admin')
          .eq('user_id', userId)
          .order('data_adicao', { ascending: true });
        if (lotesError) throw lotesError;
        const lotes = (lotesData || []).map((lote: any) => ({
          ...lote,
          quantidade_restante: lote.quantidade_adicionada - (lote.quantidade_usada || 0),
          consumos: [], // Para rastrear usos por lote
          vencido: false,
        }));

        // Buscar todos os pedidos (usos e estornos)
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('id, id_pedido_serial, titulo, created_at, creditos_debitados, status, creditos_estornados')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (pedidosError) throw pedidosError;
        const pedidos = pedidosData || [];

        // Montar lista de eventos brutos (adição, ajuste, uso, estorno)
        let eventosBrutos: any[] = [];
        lotes.forEach((lote) => {
          const isAjusteManual = lote.observacao_admin && /ajuste|erro|estorno|manual|correção|admin|subtra/i.test(lote.observacao_admin);
          const isNegativo = lote.quantidade_adicionada < 0;
          if (isAjusteManual || isNegativo) {
            eventosBrutos.push({
              tipo: 'AJUSTE_MANUAL',
              data: lote.data_adicao,
              quantidade: lote.quantidade_adicionada,
              detalhes: lote.observacao_admin || 'Ajuste manual',
            });
          } else {
            eventosBrutos.push({
              tipo: 'ADICAO_CREDITO',
              data: lote.data_adicao,
              quantidade: lote.quantidade_adicionada,
              validade: lote.data_validade,
              detalhes: `${lote.data_validade ? `Validade: ${new Date(lote.data_validade).toLocaleDateString('pt-BR')}` : 'Sem prazo de validade.'}${lote.observacao_admin ? `\nMotivo: ${lote.observacao_admin}` : ''}`,
              loteId: lote.id,
            });
          }
        });
        pedidos.forEach((pedido: any) => {
          if (pedido.creditos_debitados > 0 && !['cancelado', 'rejeitado'].includes(pedido.status)) {
            eventosBrutos.push({
              tipo: 'USO_CREDITO',
              data: pedido.created_at,
              quantidade: pedido.creditos_debitados,
              pedido,
            });
          }
          if ((pedido.status === 'cancelado' || pedido.status === 'rejeitado') && pedido.creditos_estornados > 0) {
            eventosBrutos.push({
              tipo: 'ESTORNO_CREDITO',
              data: pedido.created_at,
              quantidade: pedido.creditos_estornados,
              pedido,
            });
          }
        });
        // Ordenar todos os eventos por data ASC
        eventosBrutos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        // Simular FIFO dos lotes e vencimento real
        let saldo = 0;
        let lotesAbertos = lotes.map(l => ({ ...l }));
        let timeline: EventoTimeline[] = [];
        for (const evento of eventosBrutos) {
          if (evento.tipo === 'ADICAO_CREDITO') {
            saldo += evento.quantidade;
            timeline.push({
              tipo: 'ADICAO_CREDITO',
              data: evento.data,
              descricao: `+${evento.quantidade} crédito${evento.quantidade === 1 ? '' : 's'} adicionados`,
              detalhes: evento.detalhes,
              saldoApos: saldo,
            });
          } else if (evento.tipo === 'AJUSTE_MANUAL') {
            saldo += evento.quantidade;
            timeline.push({
              tipo: 'AJUSTE_MANUAL',
              data: evento.data,
              descricao: `${evento.quantidade > 0 ? '+' : ''}${evento.quantidade} crédito${Math.abs(evento.quantidade) === 1 ? '' : 's'} ${evento.quantidade > 0 ? 'adicionados' : 'subtraídos'} pelo Atendimento`,
              detalhes: evento.detalhes,
              saldoApos: saldo,
              admin: true,
            });
          } else if (evento.tipo === 'USO_CREDITO') {
            let qtdRestante = evento.quantidade;
            let debitoDetalhe = [];
            for (const lote of lotesAbertos) {
              if (qtdRestante <= 0) break;
              const disponivel = lote.quantidade_adicionada - (lote.quantidade_usada || 0);
              if (disponivel > 0) {
                const debitar = Math.min(qtdRestante, disponivel);
                lote.quantidade_usada = (lote.quantidade_usada || 0) + debitar;
                qtdRestante -= debitar;
                debitoDetalhe.push(`-${debitar} do lote de ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}`);
              }
            }
            saldo -= evento.quantidade;
            if (saldo < 0) saldo = 0;
            timeline.push({
              tipo: 'USO_CREDITO',
              data: evento.data,
              descricao: `- ${evento.quantidade} crédito${evento.quantidade === 1 ? '' : 's'} usados no pedido #${evento.pedido.id_pedido_serial || (evento.pedido.id?.substring(0,8))}`,
              detalhes: `Pedido: ${evento.pedido.titulo || 'Sem título'}\n${debitoDetalhe.join(', ')}`,
              saldoApos: saldo,
            });
          } else if (evento.tipo === 'ESTORNO_CREDITO') {
            // Estorno: devolve créditos para o lote mais antigo que já venceu ou foi usado
            let qtdRestante = evento.quantidade;
            let estornoDetalhe = [];
            for (const lote of lotesAbertos) {
              if (qtdRestante <= 0) break;
              const usado = lote.quantidade_usada || 0;
              if (usado > 0) {
                const estornar = Math.min(qtdRestante, usado);
                lote.quantidade_usada = usado - estornar;
                qtdRestante -= estornar;
                estornoDetalhe.push(`+${estornar} ao lote de ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}`);
              }
            }
            saldo += evento.quantidade;
            timeline.push({
              tipo: 'ESTORNO_CREDITO',
              data: evento.data,
              descricao: `+${evento.quantidade} crédito${evento.quantidade === 1 ? '' : 's'} estornados (pedido cancelado/rejeitado)`,
              detalhes: `Pedido #${evento.pedido.id_pedido_serial || (evento.pedido.id?.substring(0,8))} (${evento.pedido.titulo || 'Sem título'})\n${estornoDetalhe.join(', ')}`,
              saldoApos: saldo,
            });
          }
        }
        // Após todos os eventos, processar vencimento real dos lotes
        const now = new Date();
        for (const lote of lotesAbertos) {
          if (lote.data_validade && new Date(lote.data_validade) < now) {
            const creditosNaoUsados = lote.quantidade_adicionada - (lote.quantidade_usada || 0);
            if (creditosNaoUsados > 0) {
              const diasVencidos = Math.floor((now.getTime() - new Date(lote.data_validade).getTime()) / (1000 * 60 * 60 * 24));
              saldo -= creditosNaoUsados;
              if (saldo < 0) saldo = 0;
              timeline.push({
                tipo: 'CREDITOS_VENCIDOS',
                data: lote.data_validade,
                descricao: `Créditos vencidos (${diasVencidos} dia${diasVencidos === 1 ? '' : 's'}): ${creditosNaoUsados}`,
                detalhes: `Lote adicionado em ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}. Validade: ${new Date(lote.data_validade).toLocaleDateString('pt-BR')}`,
                saldoApos: saldo,
                diasVencidos,
                creditosVencidos: creditosNaoUsados,
              });
            }
          }
        }
        // Ordenar timeline por data ASC para exibição cronológica
        timeline.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        // Calcular saldo acumulado fielmente
        let saldoAcumulado = 0;
        for (const evento of timeline) {
          let delta = 0;
          switch (evento.tipo) {
            case 'ADICAO_CREDITO':
            case 'ESTORNO_CREDITO':
            case 'AJUSTE_MANUAL':
              delta = parseInt(evento.descricao.match(/([+-]?\d+)/)?.[1] || '0', 10);
              break;
            case 'USO_CREDITO':
            case 'CREDITOS_VENCIDOS':
            case 'EXPIRACAO_CREDITO':
              delta = -Math.abs(parseInt(evento.descricao.match(/([+-]?\d+)/)?.[1] || '0', 10));
              break;
            default:
              delta = 0;
          }
          saldoAcumulado += delta;
          if (saldoAcumulado < 0) saldoAcumulado = 0;
          evento.saldoApos = saldoAcumulado;
        }
        setEventosTimeline(timeline);
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
            {eventosTimeline.slice().reverse().map((evento, idx) => {
              const isAjusteManual = evento.tipo === 'AJUSTE_MANUAL' || evento.admin;
              const isVencido = evento.tipo === 'CREDITOS_VENCIDOS';
              return (
                <li key={`${evento.tipo}-${evento.data}-${idx}`} className="mb-6 ml-2 relative">
                  <span className={`absolute -left-6 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-background
                    ${evento.tipo === 'ADICAO_CREDITO' ? 'bg-green-100 dark:bg-green-900' :
                      evento.tipo === 'USO_CREDITO' ? 'bg-red-100 dark:bg-red-900' :
                      evento.tipo === 'EXPIRACAO_CREDITO' || isVencido ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      evento.tipo === 'ESTORNO_CREDITO' ? 'bg-blue-100 dark:bg-blue-900' :
                      isAjusteManual ? 'bg-purple-100 dark:bg-purple-900' :
                      'bg-background'}`}>
                    {getIcon(isVencido ? 'EXPIRACAO_CREDITO' : evento.tipo)}
                  </span>
                  <Card className={`p-4 border shadow-sm bg-card text-card-foreground
                    ${evento.tipo === 'ADICAO_CREDITO' ? 'border-green-400' :
                      evento.tipo === 'USO_CREDITO' ? 'border-red-400' :
                      evento.tipo === 'EXPIRACAO_CREDITO' || isVencido ? 'border-yellow-400' :
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
                      {isVencido && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-bold dark:bg-yellow-700 dark:text-yellow-100">Vencido</span>
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