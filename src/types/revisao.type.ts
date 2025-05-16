import type { Pedido, TipoStatusPedido } from './pedido.type';

export interface RevisaoStatusAdmin {
  SOLICITADA: 'solicitada';
  EM_ANDAMENTO_ADMIN: 'em_andamento_admin';
  REVISADO_FINALIZADO: 'revisado_finalizado';
  INFO_SOLICITADA_AO_CLIENTE: 'info_solicitada_ao_cliente';
  NEGADA: 'negada';
  CLIENTE_RESPONDEU: 'cliente_respondeu';
}

export const REVISAO_STATUS_ADMIN = {
  SOLICITADA: 'solicitada_cliente',
  EM_ANDAMENTO_ADMIN: 'em_andamento_admin',
  INFO_SOLICITADA_AO_CLIENTE: 'info_solicitada_ao_cliente',
  CLIENTE_RESPONDEU: 'cliente_respondeu',
  REVISADO_FINALIZADO: 'revisado_finalizado',
  NEGADA: 'negada',
} as const;

export type TipoRevisaoStatusAdmin = typeof REVISAO_STATUS_ADMIN[keyof typeof REVISAO_STATUS_ADMIN];

export interface SolicitacaoRevisaoAdmin {
  id_solicitacao: string;
  data_solicitacao: string;
  status_revisao: TipoRevisaoStatusAdmin;
  descricao_cliente: string;
  admin_feedback?: string | null;
  data_conclusao_revisao?: string | null;
  
  pedido_id: string;
  pedido_id_serial: string;
  pedido_status_atual: TipoStatusPedido;
  pedido_titulo?: string | null;
  pedido_audio_original_url?: string | null;

  cliente_user_id: string;
  cliente_nome?: string | null;
  cliente_email?: string | null;
}

// Tipos para a visualização do cliente sobre as revisões
export interface VersaoAudioRevisadoCliente {
  id: string; // ID da tabela versoes_audio_revisao
  audioUrl: string; // Mapeado de audio_url
  enviadoEm: string; // Mapeado de enviado_em
  comentariosAdmin?: string | null; // Mapeado de comentarios_admin da tabela versoes_audio_revisao
  numeroVersao: number;
}

export interface SolicitacaoRevisaoParaCliente {
  id: string; // ID da solicitação de revisão (tabela solicitacoes_revisao)
  descricaoCliente: string; // Descrição feita pelo cliente
  dataSolicitacao: string;
  adminFeedback?: string | null; // Feedback geral do admin para esta solicitação (da tabela solicitacoes_revisao)
  cliente_info_response_details?: string | null;
  data_resposta_cliente?: string | null;
  dataConclusaoRevisao?: string | null;
  statusRevisao: TipoRevisaoStatusAdmin; // Para referência, caso necessário
  versoesAudio: VersaoAudioRevisadoCliente[];
} 