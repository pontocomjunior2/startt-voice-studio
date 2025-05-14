export interface Locutor {
  id: string;
  created_at?: string;
  nome: string;
  descricao?: string | null;
  avatar_url?: string | null;
  audio_preview_url: string;
  tipo_voz?: string;
  ativo?: boolean;
}

export type PedidoStatus = 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'rejeitado';

export interface Pedido {
  id_pedido: string;
  created_at: string;
  id_cliente: string;
  id_locutor: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: PedidoStatus;
  tempo_estimado_segundos?: number;
  titulo?: string;
  estilo_locucao?: string;
  orientacoes?: string | null;
  arquivo_url?: string | null;
  baixado_em?: string | null;
  cliente_notificado_em?: string | null;
} 