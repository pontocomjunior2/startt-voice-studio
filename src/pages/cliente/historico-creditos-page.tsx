import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Clock, Circle, AlertTriangle, Undo2, UserCog, Ban } from 'lucide-react';

interface EventoTimeline {
  tipo: 'ADICAO_CREDITO' | 'USO_CREDITO' | 'EXPIRACAO_CREDITO' | 'ESTORNO_CREDITO' | 'AJUSTE_MANUAL' | 'CREDITOS_VENCIDOS' | 'PEDIDO_CANCELADO';
  data: string;
  descricao: string;
  detalhes: string;
  saldoApos?: number;
  saldoAposEvento?: number;
  admin?: boolean;
  diasVencidos?: number;
  creditosVencidos?: number;
}

const getIcon = (tipo: EventoTimeline['tipo']) => {
  if (tipo === 'ADICAO_CREDITO') return <PlusCircle className="h-5 w-5 text-green-500" />;
  if (tipo === 'USO_CREDITO') return <MinusCircle className="h-5 w-5 text-red-500" />;
  if (tipo === 'EXPIRACAO_CREDITO') return <Clock className="h-5 w-5 text-yellow-600" />;
  if (tipo === 'ESTORNO_CREDITO') return <Undo2 className="h-5 w-5 text-blue-500" />;
  if (tipo === 'PEDIDO_CANCELADO') return <Ban className="h-5 w-5 text-gray-500" />;
  if (tipo === 'AJUSTE_MANUAL') return <UserCog className="h-5 w-5 text-purple-600" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
};

const HistoricoCreditosPage: React.FC = () => {
  const { profile } = useAuth();
  const [eventosTimeline, setEventosTimeline] = useState<EventoTimeline[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-lg">Carregando perfil...</span>
      </div>
    );
  }

  useEffect(() => {
    const fetchEventosTimelineComSaldoCorrigido = async () => {
      if (!profile?.id) {
        console.log('[TimelineV3] Perfil não carregado.');
        setLoadingTimeline(false); setEventosTimeline([]); return;
      }
      setLoadingTimeline(true);
      console.log('[TimelineV3] Iniciando para user:', profile.id);
      try {
        const userId = profile.id;
        let eventosBrutosParaTimeline: any[] = [];

        // 1. Buscar TODOS os Lotes de Créditos Adicionados
        console.log('[TimelineV3] Buscando lotes...');
        const { data: lotesData, error: lotesError } = await supabase
          .from('lotes_creditos')
          .select('id, quantidade_adicionada, data_adicao, data_validade')
          .eq('user_id', userId);
        if (lotesError) throw lotesError;
        console.log('[TimelineV3] Lotes recebidos:', lotesData);

        lotesData?.forEach(lote => {
          eventosBrutosParaTimeline.push({
            tipo: 'ADICAO_LOTE',
            data: new Date(lote.data_adicao).toISOString(),
            lote_id: lote.id,
            quantidade: lote.quantidade_adicionada,
            data_validade_lote: lote.data_validade,
            descricao: `${lote.quantidade_adicionada} créditos adicionados.`,
            detalhes: lote.data_validade ? `Validade: ${new Date(lote.data_validade).toLocaleDateString('pt-BR')}` : 'Sem prazo de validade.',
          });
        });

        // 2. Buscar TODOS os Pedidos (Uso de Créditos)
        console.log('[TimelineV3] Buscando pedidos...');
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos')
          .select('id, id_pedido_serial, titulo, created_at, creditos_debitados, status')
          .eq('user_id', userId)
          .neq('status', 'rejeitado');
        if (pedidosError) throw pedidosError;
        console.log('[TimelineV3] Pedidos recebidos:', pedidosData);

        pedidosData?.forEach(pedido => {
          if (pedido.creditos_debitados > 0) {
            
            // Lógica para diferenciar o tipo de evento do pedido
            let tipoEvento: EventoTimeline['tipo'] = 'USO_CREDITO';
            let descricaoEvento = `Pedido #${pedido.id_pedido_serial || pedido.id.substring(0,8)} (${pedido.titulo || 'Sem título'})`;
            let detalhesEvento = `- ${pedido.creditos_debitados} créditos utilizados.`;

            if (pedido.status === 'estornado' || pedido.status === 'cancelado_pelo_usuario') {
              tipoEvento = 'ESTORNO_CREDITO';
              descricaoEvento = `Estorno de ${pedido.creditos_debitados} créditos`;
              detalhesEvento = `Referente ao pedido #${pedido.id_pedido_serial || pedido.id.substring(0,8)} (${pedido.titulo || 'Sem título'}) cancelado.`;
            }

            eventosBrutosParaTimeline.push({
              tipo: tipoEvento,
              data: new Date(pedido.created_at).toISOString(),
              pedido_id: pedido.id,
              quantidade: pedido.creditos_debitados, // Mantemos a quantidade para consistência
              descricao: descricaoEvento,
              detalhes: detalhesEvento,
            });
          }
        });

        // 3. Ordenar todos os eventos brutos pela data (MAIS ANTIGO PRIMEIRO para cálculo progressivo)
        eventosBrutosParaTimeline.sort((a, b) => {
          const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
          if (diff === 0) {
              if (a.tipo === 'ADICAO_LOTE' && b.tipo !== 'ADICAO_LOTE') return -1;
              if (a.tipo !== 'ADICAO_LOTE' && b.tipo === 'ADICAO_LOTE') return 1;
          }
          return diff;
        });
        console.log('[TimelineV3] Eventos Brutos ORDENADOS (antigo->novo):', JSON.stringify(eventosBrutosParaTimeline, null, 2));

        // 4. Iterar para calcular saldo progressivo e gerar eventos de expiração dinamicamente
        const eventosFinaisParaExibicao: any[] = [];
        let saldoLinhaDoTempo = 0;
        let estadoSimuladoDosLotes: Array<{
          id: string;
          data_adicao: string;
          data_validade: string | null;
          saldoRestanteNoLote: number;
        }> = [];

        for (const eventoAtual of eventosBrutosParaTimeline) {
          const dataDoEventoAtual = new Date(eventoAtual.data);
          console.log(`\n[TimelineV3 Loop] Processando Evento em ${eventoAtual.data}:`, eventoAtual.tipo, eventoAtual.quantidade || '');
          console.log(`[TimelineV3 Loop] Saldo ANTES das expirações para este evento: ${saldoLinhaDoTempo}`);

          // A. Processar expirações de lotes que venceram ANTES da data deste evento ATUAL
          let creditosExpiradosAgora = 0;
          const lotesAindaNaoExpirados = [];
          for (const lote of estadoSimuladoDosLotes) {
            if (lote.data_validade && new Date(lote.data_validade) < dataDoEventoAtual && lote.saldoRestanteNoLote > 0) {
              console.log(`[TimelineV3 Loop] Lote ${lote.id} (saldo ${lote.saldoRestanteNoLote}) expirou em ${lote.data_validade} (ANTES de ${eventoAtual.data}).`);
              creditosExpiradosAgora += lote.saldoRestanteNoLote;
              // Adicionar evento de expiração para exibição
              eventosFinaisParaExibicao.push({
                tipo: 'EXPIRACAO_CREDITO',
                data: lote.data_validade,
                descricao: `${lote.saldoRestanteNoLote} créditos expiraram.`,
                detalhes: `Dos créditos adicionados em ${new Date(lote.data_adicao).toLocaleDateString('pt-BR')}.`,
                saldoAposEvento: saldoLinhaDoTempo - creditosExpiradosAgora,
              });
              lote.saldoRestanteNoLote = 0;
            }
            if (lote.saldoRestanteNoLote > 0 && (!lote.data_validade || new Date(lote.data_validade) >= dataDoEventoAtual)) {
              lotesAindaNaoExpirados.push(lote);
            }
          }
          estadoSimuladoDosLotes = lotesAindaNaoExpirados;
          saldoLinhaDoTempo -= creditosExpiradosAgora;
          console.log(`[TimelineV3 Loop] Créditos perdidos por expiração ANTES deste evento: ${creditosExpiradosAgora}. Saldo ATUALIZADO: ${saldoLinhaDoTempo}`);

          // B. Aplicar o evento ATUAL
          let eventoPrincipalParaExibicao = { ...eventoAtual };

          if (eventoAtual.tipo === 'ADICAO_LOTE') {
            estadoSimuladoDosLotes.push({
              id: eventoAtual.lote_id,
              data_adicao: eventoAtual.data,
              data_validade: eventoAtual.data_validade_lote,
              saldoRestanteNoLote: eventoAtual.quantidade,
            });
            saldoLinhaDoTempo += eventoAtual.quantidade;
            console.log(`[TimelineV3 Loop] ADICAO: +${eventoAtual.quantidade}. Novo Saldo: ${saldoLinhaDoTempo}`);
          } else if (eventoAtual.tipo === 'USO_CREDITO') {
            let creditosADebitar = eventoAtual.quantidade;
            saldoLinhaDoTempo -= creditosADebitar;
            estadoSimuladoDosLotes.sort((a,b) => (a.data_validade ? new Date(a.data_validade).getTime() : Infinity) - (b.data_validade ? new Date(b.data_validade).getTime() : Infinity) || new Date(a.data_adicao).getTime() - new Date(b.data_adicao).getTime());
            for (const lote of estadoSimuladoDosLotes) {
              if (creditosADebitar <= 0) break;
              if (lote.saldoRestanteNoLote > 0 && (!lote.data_validade || new Date(lote.data_validade) >= dataDoEventoAtual)) {
                const debitarDesteLote = Math.min(creditosADebitar, lote.saldoRestanteNoLote);
                lote.saldoRestanteNoLote -= debitarDesteLote;
                creditosADebitar -= debitarDesteLote;
                console.log(`[TimelineV3 Loop] USO: Debitou ${debitarDesteLote} do lote ${lote.id}. Resta no lote: ${lote.saldoRestanteNoLote}.`);
              }
            }
            if (creditosADebitar > 0) {
              console.warn(`[TimelineV3 Loop] USO: Não foi possível debitar todos os ${eventoAtual.quantidade} créditos. Faltaram ${creditosADebitar}. Isso indica saldo negativo ou problema na lógica.`);
            }
            console.log(`[TimelineV3 Loop] USO: -${eventoAtual.quantidade}. Novo Saldo: ${saldoLinhaDoTempo}`);
          } else if (eventoAtual.tipo === 'ESTORNO_CREDITO') {
            // Para estorno, a lógica é a mesma de uma adição de lote
            estadoSimuladoDosLotes.push({
              id: `estorno-${eventoAtual.pedido_id}`,
              data_adicao: eventoAtual.data,
              data_validade: null, // Estornos não deveriam ter validade
              saldoRestanteNoLote: eventoAtual.quantidade,
            });
            // O saldo também não é somado aqui, é calculado externamente.
            console.log(`[TimelineV3 Loop] ESTORNO: Simulado como adição de ${eventoAtual.quantidade}.`);
          }
          eventoPrincipalParaExibicao.saldoAposEvento = Math.max(0, saldoLinhaDoTempo);
          eventosFinaisParaExibicao.push(eventoPrincipalParaExibicao);
        }
        console.log('[TimelineV3] Eventos FINAIS com saldo (antes da ordenação para display):', JSON.stringify(eventosFinaisParaExibicao, null, 2));

        // 5. Re-ordenar para exibição (mais recente primeiro)
        eventosFinaisParaExibicao.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setEventosTimeline(eventosFinaisParaExibicao);
        console.log('[TimelineV3] Eventos FINAIS para EXIBIÇÃO (recente->antigo):', JSON.stringify(eventosFinaisParaExibicao, null, 2));

      } catch (error) {
        console.error('[TimelineV3] Erro GERAL:', error);
        setEventosTimeline([]);
        toast.error('Erro no Histórico', { description: 'Não foi possível carregar o histórico de créditos.' });
      }
      finally { setLoadingTimeline(false); }
    };

    if (profile?.id) {
      fetchEventosTimelineComSaldoCorrigido();
    } else {
      setLoadingTimeline(false);
      setEventosTimeline([]);
    }
  }, [profile?.id, supabase, toast]);

  return (
    <div className="min-h-screen bg-background text-foreground max-w-2xl mx-auto py-8 px-2 md:px-0">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Histórico de Créditos</h1>
      {/* Card de saldo real */}
      <Card className="mb-6 p-4 flex flex-col items-center bg-card text-card-foreground border-none">
        <div className="text-lg font-semibold text-blue-400">Saldo atual</div>
        <div className="text-3xl font-bold text-blue-400">{profile?.saldoCalculadoCreditos ?? 0} crédito{profile?.saldoCalculadoCreditos === 1 ? '' : 's'}</div>
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
      {/* Timeline dos eventos */}
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
              const isVencido = evento.tipo === 'CREDITOS_VENCIDOS';
              return (
                <li key={`${evento.tipo}-${evento.data}-${idx}`} className="mb-6 ml-2 relative">
                  <span className={`absolute -left-6 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-background
                    ${evento.tipo === 'ADICAO_CREDITO' ? 'bg-green-900' :
                      evento.tipo === 'USO_CREDITO' ? 'bg-red-900' :
                      evento.tipo === 'EXPIRACAO_CREDITO' || isVencido ? 'bg-muted' :
                      evento.tipo === 'ESTORNO_CREDITO' ? 'bg-blue-900' :
                      evento.tipo === 'PEDIDO_CANCELADO' ? 'bg-gray-700' :
                      isAjusteManual ? 'bg-purple-900' :
                      'bg-background'}`}>
                    {getIcon(isVencido ? 'EXPIRACAO_CREDITO' : evento.tipo)}
                  </span>
                  <Card className={`p-4 border-none shadow-sm bg-card text-card-foreground`}>
                    <div className="mb-1 flex items-center justify-between">
                      <time className="text-sm font-normal leading-none text-muted-foreground">
                        {new Date(evento.data).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                      {isAjusteManual && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-purple-200 text-purple-900 text-xs font-bold dark:bg-purple-700 dark:text-purple-100">Atendimento</span>
                      )}
                      {evento.tipo === 'ESTORNO_CREDITO' && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-xs font-bold dark:bg-blue-700 dark:text-blue-100">Estorno</span>
                      )}
                      {isVencido && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-bold">Vencido</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{evento.descricao}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{evento.detalhes}</p>
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