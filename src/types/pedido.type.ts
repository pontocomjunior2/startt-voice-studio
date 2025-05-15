export interface PedidoStatus {
  PENDENTE: 'pendente';
  GRAVANDO: 'gravando';
  CONCLUIDO: 'concluido';
  CANCELADO: 'cancelado';
  EM_REVISAO: 'em_revisao';
  REJEITADO?: 'rejeitado';
}

export const PEDIDO_STATUS: PedidoStatus = {
  PENDENTE: 'pendente',
  GRAVANDO: 'gravando',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
  EM_REVISAO: 'em_revisao',
  REJEITADO: 'rejeitado',
};

export type TipoStatusPedido = PedidoStatus[keyof PedidoStatus];

// Interface para o perfil do usuário, usada em AdminPedido
export interface ProfileInPedido {
  id: string;
  full_name?: string | null;
  username?: string | null;
}

// Interface AdminPedido movida para cá
export interface AdminPedido {
  id: string;
  id_pedido_serial: string;
  created_at: string;
  texto_roteiro: string | null;
  status: string; // Pode ser TipoStatusPedido, mas mantendo string por consistência com o hook original
  user_id: string;
  profile: ProfileInPedido | null;
  locutores: { nome: string } | null;
  audio_final_url?: string | null;
  titulo: string;
  estilo_locucao?: string;
  orientacoes: string | null;
  tipo_audio?: string | null;
}

export interface Pedido {
  id: string;
  id_pedido_serial: string;
  created_at: string;
  texto_roteiro: string;
  creditos_debitados: number;
  status: TipoStatusPedido;
  audio_final_url?: string | null;
  downloaded_at: string | null;
  cliente_notificado_em: string | null;
  locutores: { nome: string } | null;
  titulo?: string | null;
  tipo_audio?: string | null;
  solicitacoes_revisao_count?: number;
}

// Tipos para o Histórico Detalhado do Pedido e Revisões

export interface VersaoAudioRevisadoDetalhada {
  id: string;
  audio_url_revisado: string;
  nome_arquivo_revisado?: string | null;
  data_envio: string;
  comentario_admin?: string | null;
}

export interface SolicitacaoRevisaoDetalhada {
  id: string; // ID da solicitação de revisão
  pedido_id: string;
  user_id: string; // ID do cliente que solicitou
  descricao_cliente: string; // Descrição feita pelo cliente
  data_solicitacao: string;
  status_revisao: string; // Usar TipoRevisaoStatusAdmin se possível, ou string genérica
  admin_feedback?: string | null; // Feedback geral do admin para esta solicitação
  data_conclusao_revisao?: string | null;
  versoes_audio_revisao: VersaoAudioRevisadoDetalhada[];
}

// Esboço inicial para eventos na linha do tempo do pedido.
// Poderemos adicionar mais tipos de eventos conforme necessário (ex: mudança de status manual, etc.)
export type TipoEventoPedido = 
  | 'SOLICITACAO_REVISAO_CLIENTE' 
  | 'RESPOSTA_REVISAO_ADMIN' 
  | 'AUDIO_FINAL_ENTREGUE' 
  | 'STATUS_PEDIDO_ALTERADO';

export interface PedidoEventoSinalizado {
  id_evento: string; // Pode ser o ID da solicitação, da versão do áudio, ou um ID gerado
  tipo_evento: TipoEventoPedido;
  timestamp: string; // Data e hora do evento
  descricao_principal?: string | null; // Ex: Descrição do cliente, feedback do admin, nome do arquivo
  detalhes_secundarios?: string | null; // Ex: Status para o qual mudou, comentário adicional
  status_revisao_associado?: string | null; // Para filtrar ou dar cor
  audio_url_associado?: string | null;
  nome_arquivo_associado?: string | null;
  realizado_por_user_id?: string | null; // Quem disparou o evento (cliente ou admin)
  // Adicionar mais campos conforme a necessidade de exibição
}

export interface HistoricoPedidoDetalhado extends AdminPedido {
  // AdminPedido já contém a maioria das informações do pedido
  solicitacoes_revisao_detalhadas: SolicitacaoRevisaoDetalhada[];
  // Futuramente, podemos adicionar: 
  // logs_status_alterado: StatusChangeLog[]; 
  // outros_eventos_importantes: OutroTipoDeEvento[];
}

// Fim dos tipos para Histórico 