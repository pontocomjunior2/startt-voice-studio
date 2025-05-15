import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreVertical, Edit3, Trash2, Eye, DownloadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pedido } from '@/types/pedido.type'; // Ajuste para seu tipo Pedido
import { PEDIDO_STATUS } from '@/types/pedido.type';

interface PedidoTableRowProps {
  pedido: Pedido;
  onNavigateToEdit: (pedidoId: string) => void;
  onOpenConfirmarExclusaoModal: (pedido: Pedido) => void;
  onOpenHistoricoRevisoesModal: (pedido: Pedido) => void;
  onAbrirModalDetalhesOuBaixar: (pedido: Pedido) => void;
  onOpenRevisaoModal: (pedido: Pedido) => void;
  loadingRevisaoPedidoId: string | null; // ID do pedido cuja revisão está sendo carregada/submetida
}

export const PedidoTableRow: React.FC<PedidoTableRowProps> = ({
  pedido,
  onNavigateToEdit,
  onOpenConfirmarExclusaoModal,
  onOpenHistoricoRevisoesModal,
  onAbrirModalDetalhesOuBaixar,
  onOpenRevisaoModal,
  loadingRevisaoPedidoId,
}) => {
  const isPendente = pedido.status === PEDIDO_STATUS.PENDENTE;
  const isConcluido = pedido.status === PEDIDO_STATUS.CONCLUIDO;
  // Esta lógica estava em MeusAudiosPage, mas parece mais relacionada a quando mostrar o botão de download original
  // ou detalhes, então simplifiquei aqui.
  // A lógica exata do que é "isEmRevisaoComAudio" pode precisar de ajuste fino se o comportamento for diferente do original.
  const isEmRevisao = pedido.status === PEDIDO_STATUS.EM_REVISAO;
  const podeSolicitarRevisao = isConcluido; // Regra original era apenas para isConcluido
  
  const podeVerDetalhesGeral = 
    pedido.status !== PEDIDO_STATUS.PENDENTE &&
    pedido.status !== PEDIDO_STATUS.CANCELADO &&
    !isConcluido &&
    !isEmRevisao; // Se está em revisão, botões específicos são mostrados

  return (
    <TableRow key={pedido.id} className="hover:bg-muted/10 odd:bg-card even:bg-muted/5 transition-colors">
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{pedido.id_pedido_serial}</TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
        {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        <span className="block text-xs text-muted-foreground">
          {new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium">
        {pedido.tipo_audio ? (
          <span className={cn(
            pedido.tipo_audio.toUpperCase() === 'PROD' ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {pedido.tipo_audio.toUpperCase()}
          </span>
        ) : (
          <span className="text-muted-foreground italic">N/D</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
        {pedido.status ? (
          <Badge
            variant={(() => {
              switch (pedido.status) {
                case PEDIDO_STATUS.GRAVANDO: return 'secondary';
                case PEDIDO_STATUS.CANCELADO: return 'destructive';
                case PEDIDO_STATUS.PENDENTE:
                case PEDIDO_STATUS.CONCLUIDO: return 'default';
                case PEDIDO_STATUS.EM_REVISAO: return 'outline';
                case PEDIDO_STATUS.REJEITADO: return 'destructive';
                default: return 'secondary';
              }
            })()}
            className={cn(
              "whitespace-nowrap",
              pedido.status === PEDIDO_STATUS.PENDENTE && "bg-status-orange text-primary-foreground border-status-orange",
              pedido.status === PEDIDO_STATUS.CONCLUIDO && "text-green-700 border-status-green bg-green-100 dark:text-green-300 dark:border-status-green dark:bg-status-green/20",
              pedido.status === PEDIDO_STATUS.EM_REVISAO && "text-blue-700 border-blue-700 bg-blue-100 dark:text-blue-300 dark:border-blue-300 dark:bg-blue-700/20",
              pedido.status === PEDIDO_STATUS.REJEITADO && "bg-red-700 text-white border-red-700",
            )}
          >
            {pedido.status === PEDIDO_STATUS.EM_REVISAO
              ? 'Em Revisão'
              : pedido.status.charAt(0).toUpperCase() + pedido.status.slice(1)}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic">N/D</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-foreground">
        {pedido.creditos_debitados}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {isPendente && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Mais ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onNavigateToEdit(pedido.id)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar Pedido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenConfirmarExclusaoModal(pedido)} className="text-red-600 hover:!text-red-600 focus:!text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Pedido
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onOpenHistoricoRevisoesModal(pedido)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isConcluido && (
            <>
              <Button
                size="sm"
                onClick={() => onAbrirModalDetalhesOuBaixar(pedido)}
                className={cn(
                  "flex items-center",
                  !pedido.downloaded_at && "bg-status-green text-primary-foreground hover:bg-green-600 dark:bg-status-green dark:hover:bg-green-600",
                  pedido.downloaded_at && "bg-green-300 dark:bg-green-700 text-green-800 dark:text-green-100 opacity-75 hover:opacity-100",
                  !pedido.audio_final_url && "opacity-50 cursor-not-allowed"
                )}
                disabled={!pedido.audio_final_url && !(pedido.solicitacoes_revisao_count && pedido.solicitacoes_revisao_count > 0)}
              >
                <DownloadCloud className="mr-2 h-4 w-4" />
                {pedido.solicitacoes_revisao_count && pedido.solicitacoes_revisao_count > 0
                  ? "Ver Detalhes/Baixar"
                  : (pedido.downloaded_at ? "Baixado" : "Baixar")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Mais ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenRevisaoModal(pedido)} disabled={loadingRevisaoPedidoId === pedido.id}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Solicitar Revisão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          {isEmRevisao && (
            <>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "opacity-70",
                  pedido.downloaded_at && "opacity-50 text-muted-foreground"
                )}
                onClick={() => onAbrirModalDetalhesOuBaixar(pedido)} // Para baixar o original ou ver detalhes
                aria-label="Baixar áudio original (atualmente em revisão)"
                title={pedido.downloaded_at ? "Áudio original já baixado (ver detalhes)" : "Baixar áudio original (atualmente em revisão)"}
              >
                <DownloadCloud className="mr-1.5 h-4 w-4" />
                {pedido.downloaded_at ? "Original Baixado" : "Original"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenHistoricoRevisoesModal(pedido)}
                className="flex items-center"
                title="Ver detalhes e histórico de revisões deste pedido"
              >
                <Eye className="mr-2 h-4 w-4" />
                Detalhes
              </Button>
            </>
          )}

          {podeVerDetalhesGeral && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenHistoricoRevisoesModal(pedido)}
              className="flex items-center"
              title="Ver detalhes e histórico de revisões deste pedido"
            >
              <Eye className="mr-2 h-4 w-4" />
              Detalhes
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}; 