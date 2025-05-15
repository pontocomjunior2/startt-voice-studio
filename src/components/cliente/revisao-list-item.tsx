import React from 'react';
import { DownloadCloud, Edit, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SolicitacaoRevisaoParaCliente, VersaoAudioRevisadoCliente } from '@/types/revisao.type';
import { REVISAO_STATUS_ADMIN } from '@/types/revisao.type'; // Assumindo que está definido aqui
import { cn } from '@/lib/utils'; // Adicionado cn para classes condicionais

// Função para formatar data/hora - idealmente viria de um utilitário
// Se for usada apenas aqui, pode ser mantida localmente.
// Por enquanto, estou assumindo que será passada via props ou definida no componente pai.
// const formatarDataHora = (dataString: string | undefined | null): string => { ... };

interface RevisaoListItemProps {
  solicitacao: SolicitacaoRevisaoParaCliente;
  numeroSolicitacao: number; // Para exibir "Solicitação de Revisão X"
  handleDownloadVersao: (url: string | null | undefined, nomeBase: string) => void;
  formatarDataHora: (dataString: string | undefined | null) => string;
  idPedidoSerial: string;
  onAbrirResponderInfoModal: (solicitacao: SolicitacaoRevisaoParaCliente) => void;
}

export const RevisaoListItem: React.FC<RevisaoListItemProps> = ({
  solicitacao,
  numeroSolicitacao,
  handleDownloadVersao,
  formatarDataHora,
  idPedidoSerial,
  onAbrirResponderInfoModal,
}) => {
  const isInfoSolicitada = solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.INFO_SOLICITADA_PELO_ADMIN;

  return (
    <li className="border border-border p-4 rounded-lg shadow-sm bg-card">
      <div className="flex justify-between items-start mb-1">
        <h4 className="text-md font-semibold text-foreground">
          Solicitação de Revisão {numeroSolicitacao}
          <span className='text-xs text-muted-foreground ml-1'>
            (#{solicitacao.id ? solicitacao.id.substring(0, 8) : 'N/A'})
          </span>
        </h4>
        {isInfoSolicitada && (
          <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 dark:border-orange-400 dark:text-orange-300 dark:bg-orange-900/30">
            <Info className="h-3 w-3 mr-1.5" />
            +Info. Solicitada
          </Badge>
        )}
        {/* Adicionar outros badges para outros status se necessário, ex: "Negada", "Concluída" */}
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 space-x-2">
        <span>Solicitado em: {formatarDataHora(solicitacao.dataSolicitacao)}</span>
        {solicitacao.dataConclusaoRevisao && !isInfoSolicitada && (
          // Não mostrar data de conclusão se ainda está aguardando info
          <span>| Concluída em: {formatarDataHora(solicitacao.dataConclusaoRevisao)}</span>
        )}
      </div>

      <div className="mb-3 p-3 bg-muted/50 rounded-md">
        <p className="text-sm font-medium text-foreground mb-1">Sua solicitação de ajuste:</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {solicitacao.descricaoCliente || <span className="italic">Não especificado</span>}
        </p>
      </div>

      {/* Se informações foram solicitadas pelo admin */} 
      {isInfoSolicitada && solicitacao.adminInfoRequestDetails && (
        <Card className="mb-3 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center font-semibold text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 mr-2 flex-shrink-0" />
              Atendimento solicitou mais informações:
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
              {solicitacao.adminInfoRequestDetails}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback do admin para solicitações NEGADAS */} 
      {solicitacao.statusRevisao === REVISAO_STATUS_ADMIN.NEGADA && solicitacao.adminFeedback && (
        <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-md">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">
            Feedback do Atendimento sobre esta solicitação:
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400 whitespace-pre-wrap">
            {solicitacao.adminFeedback}
          </p>
        </div>
      )}
      
      {/* Botão para responder se info solicitada */} 
      {isInfoSolicitada && (
        <div className="mt-4 pt-3 border-t border-border">
          <Button 
            onClick={() => onAbrirResponderInfoModal(solicitacao)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="mr-2 h-4 w-4" />
            Fornecer Informações / Atualizar Revisão
          </Button>
        </div>
      )}

      {/* Lista de versões de áudio (apenas se não estiver aguardando info) */} 
      {!isInfoSolicitada && solicitacao.versoesAudio && solicitacao.versoesAudio.length > 0 && (
        <div className="mt-3">
          <h5 className="text-sm font-semibold text-foreground mb-2">
            Áudios Revisados Entregues (para esta solicitação):
          </h5>
          <ul className="space-y-3">
            {solicitacao.versoesAudio.map((versao: VersaoAudioRevisadoCliente, idxVer: number) => (
              <li key={versao.id || idxVer} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Versão de Revisão {versao.numeroVersao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviada em: {formatarDataHora(versao.enviadoEm)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadVersao(
                      versao.audioUrl,
                      `pedido_${idPedidoSerial}_rev${solicitacao.id ? solicitacao.id.substring(0, 4) : numeroSolicitacao}_v${versao.numeroVersao}.mp3` // Adicionado .mp3 ao nome
                    )}
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary mt-2 sm:mt-0"
                    disabled={!versao.audioUrl}
                  >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Baixar Versão {versao.numeroVersao}
                  </Button>
                </div>
                {versao.comentariosAdmin && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-md">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">
                      Comentários do Atendimento (sobre esta versão):
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">
                      {versao.comentariosAdmin}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Mensagem de "Em processamento" (apenas se não estiver aguardando info e não for negada/concluída) */} 
      {!isInfoSolicitada && 
       solicitacao.statusRevisao !== REVISAO_STATUS_ADMIN.NEGADA &&
       solicitacao.statusRevisao !== REVISAO_STATUS_ADMIN.CONCLUIDA_PELO_ADMIN && 
       (!solicitacao.versoesAudio || solicitacao.versoesAudio.length === 0) && (
          <div className="mt-3 text-sm text-muted-foreground italic border-t border-border pt-3">
            Revisão em processamento pelo atendimento.
          </div>
      )}
    </li>
  );
}; 