import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const TermosPrivacidadePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade'>('termos');
  const navigate = useNavigate();

  const termosDeUso = `<strong>TERMOS DE SERVIÇO DA PLATAFORMA STARTT BY PONTOCOM AUDIO</strong>
<strong>Última atualização: 24 de Julho de 2025</strong>

<strong>Preâmbulo</strong>
Bem-vindo à Startt! Antes de utilizar nossa plataforma online ("<strong>PLATAFORMA</strong>" ou "<strong>SITE</strong>"), acessível através do endereço eletrônico startt.pontocomaudio.net, leia atentamente estes Termos de Serviço ("<strong>Termos</strong>").

Ao utilizar a <strong>PLATAFORMA</strong>, abrir uma conta ou clicar para aceitar estes Termos, você ("<strong>CLIENTE</strong>" ou "<strong>USUÁRIO</strong>") aceita e concorda em cumprir e respeitar estes Termos de Serviço e nossa Política de Privacidade (disponível em [INSIRA O LINK PARA SUA POLÍTICA DE PRIVACIDADE AQUI]), que é parte integrante deste documento. Se você não concordar com qualquer uma de nossas políticas, não deverá acessar ou utilizar a <strong>PLATAFORMA</strong>.

A empresa Adelson Ferraz Junior ME (nome fantasia Pontocom Audio), inscrita no CNPJ/MF sob nº 07.731.566/0001-32, com sede na Rua Montevideo, 421 – Andar 2 – Bairro Araçás – Vila Velha/ES – CEP 29103-025 ("<strong>PONTOCOM AUDIO</strong>"), é a proprietária e operadora da <strong>PLATAFORMA STARTT</strong> e estabelece através deste instrumento as regras para a contratação de serviços de produção de áudio e locução.

<strong>1. Objeto</strong>
O presente instrumento tem por objeto estabelecer a política e o regulamento para: acesso e cadastro na <strong>PLATAFORMA</strong>, uso de dados pessoais conforme a LGPD, direitos de propriedade intelectual, contratação dos serviços, sistema de créditos, formas de pagamento, preços, política de revisão, garantias, responsabilidades e demais regras de uso da <strong>PLATAFORMA STARTT</strong>.

<strong>2. Nossos Serviços</strong>
A <strong>PLATAFORMA STARTT</strong> oferece um ecossistema completo para produção de áudio, comercializado através de um sistema de créditos.

<strong>a) Sistema de Créditos:</strong> Os serviços são contratados mediante o uso de dois tipos de créditos distintos:
• <strong>Créditos de Gravação:</strong> Utilizados para contratar os serviços de "Gravação Humana", que envolvem a performance e o trabalho de artistas profissionais.
• <strong>Créditos IA:</strong> Utilizados para contratar os serviços de "Gravação IA Instantânea", baseados no consumo de caracteres em nossa ferramenta de inteligência artificial.

<strong>b) Validade dos Créditos:</strong> Todos os créditos adquiridos, sejam de Gravação ou de IA, possuem uma validade de 30 (trinta) dias corridos a partir da data de sua aquisição salvo em casos específicos em que o prazo de validade pode ser determinado pela plataforma, como promoções, negociações diferenciadas, etc. Créditos não utilizados dentro deste período expirarão automaticamente e não serão acumulados, reembolsados ou transferidos.

<strong>c) Gravação Humana:</strong> O <strong>CLIENTE</strong> pode escolher entre diversas vozes profissionais disponíveis para receber um áudio de alta qualidade. Este serviço é pago com Créditos de Gravação. A produção pode ser realizada por um dos seguintes métodos, a critério da <strong>PONTOCOM AUDIO</strong> para garantir a melhor qualidade e agilidade:
• <strong>Performance Autêntica:</strong> O locutor humano escolhido grava pessoalmente o roteiro.
• <strong>Startt Synchro Voice™:</strong> Uma performance humana é gravada por um diretor de voz para garantir a emoção e o ritmo, e nossa tecnologia de IA aplica a voz do locutor escolhido sobre essa performance.

<strong>d) Gravação IA Instantânea:</strong> Para locutores sinalizados com o ícone (✨), o <strong>CLIENTE</strong> pode optar por gerar o áudio instantaneamente utilizando nossa tecnologia de Text-to-Speech (TTS). Este serviço é pago com Créditos IA.

<strong>§1°</strong> (Cálculo de Créditos de Gravação): O custo em Créditos de Gravação é calculado automaticamente com base no tempo estimado do roteiro, sendo a unidade padrão de 1 (um) crédito para cada bloco de 40 (quarenta) segundos de áudio. Se um áudio ultrapassar um bloco, um novo crédito será consumido.

<strong>§2°</strong> (Cálculo de Créditos IA): O custo em Créditos IA é calculado automaticamente com base no número de caracteres do roteiro, sendo a unidade padrão de 1 (um) Crédito IA para cada caractere.

<strong>3. Conteúdo e Responsabilidade do Cliente</strong>
<strong>a) Conteúdo Proibido:</strong> A <strong>PONTOCOM AUDIO</strong> <strong>NÃO TOLERA MATERIAIS QUE INSULTEM OU DIFAMEM, QUE CONTENHAM PALAVRÕES, DISCURSOS DE ÓDIO, CONTEÚDO VIOLENTO OU ILEGAL, PROPAGANDA ENGANOSA, OU QUE VIOLEM DIREITOS AUTORAIS DE TERCEIROS</strong>. O desrespeito a esta cláusula resultará no bloqueio imediato da conta e na recusa do serviço.

<strong>b) Responsabilidade Legal pelo Conteúdo:</strong> O <strong>CLIENTE</strong> é o único e exclusivo responsável legal pelo conteúdo que envia para gravação, respondendo judicial e extrajudicialmente por seus atos e garantindo que possui todos os direitos necessários sobre o roteiro.

<strong>c) Qualidade do Material Enviado:</strong> O <strong>CLIENTE</strong> é responsável pela revisão ortográfica, gramatical e de conteúdo dos roteiros. Erros no áudio final originados de erros no roteiro enviado pelo <strong>CLIENTE</strong> não caracterizam falha no serviço e exigirão um novo pedido para correção.

**4. Acesso e Cadastro na Plataforma**
**§1°:** O acesso a áreas públicas da **PLATAFORMA** é livre. Para a contratação de serviços, é necessário o cadastro gratuito.

**§2°:** O **CLIENTE** pessoa física deve ter 18 anos ou mais, ou ser devidamente representado por seus responsáveis legais.

**§3°:** O **CLIENTE** concorda em fornecer dados verdadeiros e completos (Nome, CPF/CNPJ, Email, etc.), mantendo-os sempre atualizados, sob pena de suspensão ou cancelamento da conta.

**§4°:** O **CLIENTE** é o único responsável por todas as atividades que ocorram em sua conta e pela segurança de sua senha.

**5. Dados e Privacidade (Conformidade com a LGPD)**
A **PONTOCOM AUDIO** está comprometida com a Lei Geral de Proteção de Dados (LGPD).

**§1°:** Os dados pessoais solicitados no cadastro são necessários para a execução do contrato (identificação, processamento de pedidos, faturamento e comunicação).

**§2°:** Empregamos medidas de segurança técnicas e administrativas para proteger seus dados.

**§3°:** Seus dados não serão compartilhados com terceiros sem consentimento, exceto quando essencial para a prestação do serviço (ex: processadores de pagamento, APIs de IA) ou mediante ordem judicial.

**§4°:** Para mais detalhes sobre como seus dados são tratados e quais são seus direitos como titular, consulte nossa Política de Privacidade.

**6. Propriedade Intelectual e Licença de Uso do Áudio**
Esta cláusula unifica todas as regras sobre direitos autorais e de uso.

**§1°** (Licença Concedida): Ao contratar um serviço e ter o pagamento aprovado, o **CLIENTE** adquire uma licença de uso perpétua e não exclusiva do áudio finalizado, estritamente para o propósito e contexto informados no pedido original.

**§2°** (Restrições de Uso): O **CLIENTE** não está autorizado a:
a) Revender, sublicenciar ou redistribuir o áudio como um produto isolado ("stock audio").
b) Utilizar o áudio, ou a voz do locutor nele contida, para treinar, alimentar ou desenvolver modelos de inteligência artificial, criar "deepfakes", ou qualquer forma de clonagem de voz.
c) Utilizar o áudio em contextos difamatórios, ilegais ou ofensivos.

**§3°** (Novos Usos): A utilização do mesmo áudio em uma nova campanha ou contexto diferente do original requer uma nova negociação e o pagamento de taxas adicionais.

**§4°** (Propriedade da Plataforma): A marca "**STARTT**", seus logotipos, e todo o conteúdo da **PLATAFORMA** são de propriedade da **PONTOCOM AUDIO**.

**7. Pagamento e Preços**
**§1°:** Os preços dos pacotes de créditos são os exibidos na **PLATAFORMA** no momento da contratação. As formas de pagamento aceitas são Cartão de Crédito e PIX, processadas de forma segura.

**§2°:** A liberação dos créditos e o início da produção de qualquer serviço só ocorrerão após a confirmação da aprovação do pagamento.

**8. Produção, Prazos e Revisões**
**a) Prazos de Entrega:**
• **Gravação Humana:** O prazo de entrega padrão é de até 24 (vinte e quatro) horas úteis no máximo.
• **Gravação IA Instantânea:** O áudio é gerado e entregue de forma instantânea.

**b) Política de Revisão e Garantia:** Nossa garantia cobre falhas no processo de produção.
• **Itens Cobertos (Revisão Gratuita):** Erros de locução, não conformidade com o roteiro ou com orientações objetivas do pedido, e problemas técnicos no arquivo.
• **Itens NÃO Cobertos (Exigem Novo Pedido):** Alterações no roteiro após o envio, mudanças subjetivas de interpretação não especificadas, e erros presentes no roteiro original enviado pelo **CLIENTE**.
• **Serviços de IA:** O serviço de "Gravação IA Instantânea" é fornecido "no estado em que se encontra" e não está sujeito a revisões de interpretação ou entonação.

**c) Prazo para Solicitação:** O **CLIENTE** deve solicitar a revisão através da **PLATAFORMA** no prazo máximo de 1 (um) dia corrido após a entrega do áudio. Após este prazo, o serviço será considerado aceito.

**9. Termos Gerais**
**§1°** (Responsabilidade): A responsabilidade da **PONTOCOM AUDIO**, por qualquer falha, limita-se ao estorno dos créditos consumidos para o pedido em questão. Não nos responsabilizamos por perdas, danos indiretos ou lucros cessantes.

**§2°** (Modificação dos Termos): A **PONTOCOM AUDIO** reserva-se o direito de alterar estes Termos periodicamente. Alterações significativas serão comunicadas aos **CLIENTES**.

**§3°** (Rescisão): O **CLIENTE** pode solicitar o encerramento de sua conta a qualquer momento via atendimento@pontocomaudio.net ou via WhatsApp do suporte. O encerramento não dá direito ao reembolso de créditos não utilizados. A **PONTOCOM AUDIO** poderá cancelar contas em caso de violação grave destes Termos.

**§4°** (Armazenamento de Pedidos): Para otimizar o desempenho da **PLATAFORMA**, os pedidos e seus respectivos áudios poderão ser arquivados ou excluídos automaticamente após 2 (dois) meses de sua conclusão. Recomenda-se que o **CLIENTE** faça o download e o backup de seus áudios.

**§5°** (Indenização): O **CLIENTE** concorda em indenizar a **PONTOCOM AUDIO** de quaisquer perdas ou danos decorrentes do uso indevido dos serviços ou da violação destes Termos, especialmente no que tange ao conteúdo dos roteiros enviados.

**10. Foro**
Fica eleito o Foro da Comarca de Vila Velha, Espírito Santo, para dirimir quaisquer litígios oriundos do presente contrato, com expressa renúncia a qualquer outro.
`;

  const politicaPrivacidade = `<strong>POLÍTICA DE PRIVACIDADE DA PLATAFORMA STARTT</strong>
<strong>Última atualização: 24 de Julho de 2025</strong>

A sua privacidade é de extrema importância para a <strong>STARTT by PONTOCOM AUDIO</strong> ("<strong>Plataforma</strong>", "<strong>nós</strong>"). Esta Política de Privacidade tem como objetivo informar você ("<strong>Cliente</strong>", "<strong>Usuário</strong>" ou "<strong>Titular</strong>") sobre quais dados pessoais coletamos, como os utilizamos, com quem os compartilhamos e como os protegemos, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) do Brasil.

Ao se cadastrar ou utilizar a Plataforma, você declara que leu e concorda com os termos desta Política.

<strong>1. Responsável pelo Tratamento dos Dados</strong>
A <strong>Adelson Ferraz Junior ME</strong> (nome fantasia <strong>Pontocom Audio</strong>), inscrita no CNPJ/MF sob nº <strong>07.731.566/0001-32</strong>, é a responsável pelo tratamento dos seus dados pessoais.

<strong>Dados de Contato do Controlador:</strong>
• <strong>E-mail:</strong> atendimento@pontocomaudio.net
• <strong>WhatsApp:</strong> (27) 99710-1531
• <strong>Responsável:</strong> Adelson Ferraz Junior

<strong>2. Dados Pessoais que Coletamos</strong>
Coletamos apenas os dados estritamente necessários para o funcionamento da Plataforma e prestação dos nossos serviços:

<strong>a) Dados de Cadastro:</strong>
• Nome completo
• E-mail
• Telefone
• CPF ou CNPJ (para emissão de notas fiscais)
• Endereço completo (quando necessário para faturamento)

<strong>b) Dados de Pagamento:</strong>
• Informações de cartão de crédito/débito (processadas pelo <strong>Mercado Pago</strong>)
• Histórico de transações
• Dados de faturamento

<strong>c) Dados de Uso da Plataforma:</strong>
• Roteiros e textos enviados para produção
• Preferências de locutores e estilos
• Histórico de pedidos
• Logs de acesso e navegação

<strong>d) Dados Técnicos:</strong>
• Endereço IP
• Tipo de navegador
• Sistema operacional
• Cookies e tecnologias similares

<strong>3. Finalidades do Tratamento</strong>
Utilizamos seus dados pessoais para as seguintes finalidades:

<strong>a) Prestação dos Serviços:</strong>
• Criar e gerenciar sua conta na Plataforma
• Processar pedidos de produção de áudio
• Entregar os arquivos finalizados
• Fornecer suporte técnico

<strong>b) Gestão Comercial:</strong>
• Processar pagamentos
• Emitir notas fiscais
• Gerenciar o sistema de créditos
• Controlar a validade dos créditos

<strong>c) Comunicação:</strong>
• Enviar notificações sobre o status dos pedidos
• Comunicar atualizações da Plataforma
• Responder dúvidas e solicitações
• Enviar informações promocionais (com seu consentimento)

<strong>d) Segurança e Conformidade:</strong>
• Prevenir fraudes e atividades maliciosas
• Cumprir obrigações legais
• Resolver disputas

<strong>e) Melhoria dos Serviços:</strong>
• Analisar o uso da Plataforma
• Desenvolver novos recursos
• Personalizar a experiência do usuário

<strong>4. Base Legal para o Tratamento</strong>
O tratamento dos seus dados pessoais é realizado com base nas seguintes bases legais previstas na LGPD:

• <strong>Execução de Contrato:</strong> Para prestação dos serviços contratados
• <strong>Legítimo Interesse:</strong> Para segurança, prevenção de fraudes e melhoria dos serviços
• <strong>Cumprimento de Obrigação Legal:</strong> Para emissão de notas fiscais e cumprimento de obrigações tributárias
• <strong>Consentimento:</strong> Para comunicações promocionais e cookies não essenciais

<strong>5. Compartilhamento de Dados</strong>
Seus dados pessoais podem ser compartilhados nas seguintes situações:

<strong>a) Prestadores de Serviços:</strong>
• <strong>Mercado Pago:</strong> Para processamento de pagamentos
• <strong>Provedores de hospedagem:</strong> Para armazenamento seguro dos dados
• <strong>Serviços de e-mail:</strong> Para comunicações da Plataforma

<strong>b) Locutores e Produtores:</strong>
• Roteiros e orientações artísticas (apenas o necessário para a produção)
• Informações de contato (quando necessário para esclarecimentos)

<strong>c) Autoridades Competentes:</strong>
• Quando exigido por lei ou ordem judicial
• Para cooperação em investigações legais

<strong>d) Transferência de Negócios:</strong>
• Em caso de fusão, aquisição ou venda da empresa

<strong>6. Armazenamento e Segurança</strong>
<strong>a) Localização dos Dados:</strong>
Seus dados são armazenados em servidores localizados no Brasil, em conformidade com a LGPD.

<strong>b) Medidas de Segurança:</strong>
• Criptografia de dados em trânsito e em repouso
• Controle de acesso restrito
• Monitoramento contínuo de segurança
• Backups regulares e seguros
• Treinamento da equipe em proteção de dados

<strong>c) Tempo de Retenção:</strong>
• <strong>Dados de cadastro:</strong> Mantidos enquanto a conta estiver ativa
• <strong>Dados de pagamento:</strong> Conforme exigências fiscais (5 anos)
• <strong>Roteiros e projetos:</strong> Mantidos por 2 anos após a conclusão
• <strong>Logs de acesso:</strong> Mantidos por 6 meses

<strong>7. Seus Direitos como Titular</strong>
Você possui os seguintes direitos em relação aos seus dados pessoais:

<strong>a) Confirmação e Acesso:</strong>
• Confirmar se tratamos seus dados
• Acessar seus dados pessoais

<strong>b) Correção:</strong>
• Corrigir dados incompletos, inexatos ou desatualizados

<strong>c) Anonimização, Bloqueio ou Eliminação:</strong>
• Solicitar anonimização ou eliminação de dados desnecessários
• Bloquear dados tratados em desconformidade

<strong>d) Portabilidade:</strong>
• Solicitar a portabilidade dos dados para outro fornecedor

<strong>e) Eliminação:</strong>
• Solicitar a eliminação dos dados tratados com base no consentimento

<strong>f) Informação:</strong>
• Obter informações sobre compartilhamento dos dados
• Conhecer as entidades com as quais compartilhamos dados

<strong>g) Revogação do Consentimento:</strong>
• Revogar o consentimento a qualquer momento

<strong>Como Exercer seus Direitos:</strong>
Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail <strong>atendimento@pontocomaudio.net</strong> ou WhatsApp <strong>(27) 99710-1531</strong>.

<strong>8. Cookies e Tecnologias Similares</strong>
Utilizamos cookies e tecnologias similares para:
• Manter você logado na Plataforma
• Lembrar suas preferências
• Analisar o uso da Plataforma
• Melhorar a experiência do usuário

Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.

<strong>9. Menores de Idade</strong>
Nossa Plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados pessoais de menores. Se tomarmos conhecimento de que coletamos dados de um menor, tomaremos medidas para excluí-los imediatamente.

<strong>10. Transferência Internacional de Dados</strong>
Atualmente, não realizamos transferência internacional de dados pessoais. Caso isso venha a ocorrer no futuro, garantiremos que seja feita em conformidade com a LGPD e com as devidas proteções.

<strong>11. Alterações nesta Política</strong>
Podemos atualizar esta Política de Privacidade periodicamente. Quando o fizermos:
• Alteraremos a data de "Última atualização" no topo deste documento
• Notificaremos você através da Plataforma ou por e-mail sobre mudanças significativas
• O uso continuado da Plataforma após as alterações constitui aceitação da nova Política

<strong>12. Incidentes de Segurança</strong>
Em caso de incidente de segurança que possa acarretar risco aos seus direitos e liberdades, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.

<strong>13. Contato e Dúvidas</strong>
Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados pessoais:

<strong>E-mail:</strong> atendimento@pontocomaudio.net
<strong>WhatsApp:</strong> (27) 99710-1531
<strong>Responsável:</strong> Adelson Ferraz Junior

<strong>Encarregado de Proteção de Dados (DPO):</strong>
Adelson Ferraz Junior
<strong>E-mail:</strong> dpo@pontocomaudio.net

Esta Política de Privacidade é parte integrante dos nossos Termos de Serviço e demonstra nosso compromisso com a proteção da sua privacidade e o cumprimento da legislação brasileira de proteção de dados.
`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Termos e Política de Privacidade
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-2 p-6">
              <Button
                variant={activeTab === 'termos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('termos')}
                className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  activeTab === 'termos' 
                    ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white shadow-md" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <FileText className="h-4 w-4" />
                Termos de Uso
              </Button>
              <Button
                variant={activeTab === 'privacidade' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('privacidade')}
                className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  activeTab === 'privacidade' 
                    ? "bg-gradient-to-r from-startt-blue to-startt-purple text-white shadow-md" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Shield className="h-4 w-4" />
                Política de Privacidade
              </Button>
            </div>
          </div>

          {/* Document Content */}
          <div className="p-6">
            <ScrollArea className="h-[calc(100vh-280px)] w-full">
              <div className="prose prose-sm max-w-none dark:prose-invert pr-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-transparent border-none p-0 m-0">
                  {activeTab === 'termos' ? termosDeUso : politicaPrivacidade}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermosPrivacidadePage;