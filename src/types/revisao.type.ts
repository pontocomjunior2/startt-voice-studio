import type { Pedido, TipoStatusPedido } from './pedido.type';

export interface RevisaoStatusAdmin {
  SOLICITADA: 'solicitada';
  EM_ANDAMENTO_ADMIN: 'em_andamento_admin';
  AGUARDANDO_UPLOAD_ADMIN: 'aguardando_upload_admin';
  CONCLUIDA_PELO_ADMIN: 'concluida_pelo_admin';
  NEGADA: 'negada';
}

export const REVISAO_STATUS_ADMIN: RevisaoStatusAdmin = {
  SOLICITADA: 'solicitada',
  EM_ANDAMENTO_ADMIN: 'em_andamento_admin',
  AGUARDANDO_UPLOAD_ADMIN: 'aguardando_upload_admin',
  CONCLUIDA_PELO_ADMIN: 'concluida_pelo_admin',
  NEGADA: 'negada',
};

export type TipoRevisaoStatusAdmin = RevisaoStatusAdmin[keyof RevisaoStatusAdmin];

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