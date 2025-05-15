export interface PedidoStatus {
  PENDENTE: 'pendente';
  GRAVANDO: 'gravando';
  CONCLUIDO: 'concluido';
  CANCELADO: 'cancelado';
  EM_REVISAO: 'Em Revisão';
}

export const PEDIDO_STATUS: PedidoStatus = {
  PENDENTE: 'pendente',
  GRAVANDO: 'gravando',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
  EM_REVISAO: 'Em Revisão',
};

export type TipoStatusPedido = PedidoStatus[keyof PedidoStatus];

export interface Pedido {
  id: string;
  id_pedido_serial: string;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: TipoStatusPedido;
  audio_final_url: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome: string } | null;
  titulo?: string | null;
} 