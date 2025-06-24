export interface Locutor {
  id: string;
  created_at?: string;
  nome: string;
  bio?: string | null;
  avatar_url?: string | null;
  amostra_audio_url: string;
  tipo_voz?: string;
  ativo?: boolean;
  /**
   * Lista de demos/áudios do locutor. Opcional, pode ser preenchida dinamicamente.
   */
  demos?: { url: string; estilo?: string }[];
  nome_artistico: string;
}

export type PedidoStatus = 'pendente' | 'gravando' | 'concluido' | 'cancelado' | 'rejeitado' | 'em_revisao';

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
  id_pedido_serial: string;
  solicitacoes_revisao_count?: number;
  locutores?: { nome: string } | null;
  tipo_audio?: string;
  audio_final_url?: string | null;
}

export interface Pacote {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  creditos_oferecidos: number;
  ativo: boolean;
  listavel: boolean;
  created_at?: string;
  updated_at?: string;
  validade_dias?: number | null;
}

export interface PacoteComLocutores extends Pacote {
  locutores: Locutor[];
} 