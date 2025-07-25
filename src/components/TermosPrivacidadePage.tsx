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

  // Função para processar texto e converter tags HTML e markdown para JSX
  const processText = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Processa markdown ** primeiro, depois tags <strong>
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Converte para JSX
      const parts = processedLine.split(/(<strong>.*?<\/strong>)/g);
      const jsx = parts.map((part, partIndex) => {
        if (part.match(/<strong>(.*?)<\/strong>/)) {
          const content = part.replace(/<strong>(.*?)<\/strong>/, '$1');
          return <strong key={partIndex} className="font-semibold text-gray-900 dark:text-gray-100">{content}</strong>;
        }
        return part;
      });

      return (
        <div key={index} className={line.trim() === '' ? 'h-4' : 'mb-2'}>
          {jsx}
        </div>
      );
    });
  };

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

<strong>1. A Empresa Controladora dos Dados</strong>
A empresa responsável pelo tratamento dos seus dados pessoais é a <strong>Adelson Ferraz Junior ME</strong> (nome fantasia <strong>Pontocom Audio</strong>), inscrita no CNPJ/MF sob nº <strong>07.731.566/0001-32</strong>, com sede na <strong>Rua Montevideu, 421 - Andar 2 - Araçás - Vila Velha/ES</strong>, doravante denominada "<strong>PONTOCOM AUDIO</strong>".

<strong>2. Quais Dados Coletamos e Para Qual Finalidade?</strong>
Coletamos seus dados pessoais estritamente para viabilizar o funcionamento da Plataforma e a prestação dos nossos serviços. A coleta ocorre nos seguintes contextos:

<strong>a) Dados de Cadastro e Conta:</strong>
• <strong>Quais dados:</strong> Nome completo ou Razão Social, CPF ou CNPJ, e-mail, nome de usuário, senha (criptografada), nome da empresa e número de WhatsApp.
• <strong>Finalidade:</strong> Criar e gerenciar sua conta, processar faturamento e pagamentos, verificar sua identidade, fornecer suporte ao cliente e enviar comunicações essenciais sobre seus pedidos e sua conta.

<strong>b) Dados para a Prestação dos Serviços (Pedidos):</strong>
• <strong>Quais dados:</strong> Textos (roteiros), orientações artísticas, títulos de projetos e, opcionalmente, arquivos de áudio guia que você nos envia.
• <strong>Finalidade:</strong> Executar o serviço principal da Plataforma, ou seja, produzir o áudio de locução conforme suas especificações. Estes dados são a matéria-prima do serviço contratado.

<strong>c) Dados de Pagamento:</strong>
• <strong>Quais dados:</strong> Informações sobre os pacotes de créditos adquiridos, histórico de transações e status de pagamento. <strong>Importante:</strong> Nós não armazenamos os dados completos do seu cartão de crédito. O processamento é feito por nosso parceiro de pagamentos (<strong>Mercado Pago</strong>), que segue os mais altos padrões de segurança.
• <strong>Finalidade:</strong> Processar a compra de pacotes de créditos e gerenciar o histórico financeiro da sua conta.

<strong>d) Dados de Navegação e Uso:</strong>
• <strong>Quais dados:</strong> Endereço IP, tipo de navegador, logs de acesso e outras informações técnicas coletadas automaticamente.
• <strong>Finalidade:</strong> Garantir a segurança da Plataforma, prevenir fraudes, analisar o desempenho e melhorar a experiência do usuário.

<strong>3. Com Quem Compartilhamos Seus Dados Pessoais?</strong>
A partilha de dados é feita de forma restrita e apenas quando essencial para a prestação do serviço. Seus dados podem ser compartilhados com:

• <strong>Locutores e Diretores de Voz:</strong> O roteiro e as orientações de um pedido são compartilhados com os profissionais envolvidos na produção do seu áudio. Eles estão contratualmente obrigados a manter a confidencialidade do seu material.
• <strong>Provedores de Serviços de IA (ElevenLabs):</strong> Ao utilizar a funcionalidade de "Gravação com IA", o texto do seu roteiro é enviado para a API do nosso parceiro tecnológico (ElevenLabs) para a geração do áudio.
• <strong>Processadores de Pagamento (Mercado Pago):</strong> Informações necessárias para a transação financeira são compartilhadas de forma segura com nosso gateway de pagamento para processar sua compra.
• <strong>Provedores de Infraestrutura (Supabase):</strong> Seus dados são armazenados de forma segura em nossa infraestrutura de banco de dados e nuvem, provida pela Supabase.
• <strong>Autoridades Legais:</strong> Em caso de requisição judicial ou obrigação legal, poderemos ser obrigados a compartilhar dados com as autoridades competentes.

<strong>4. Armazenamento e Segurança dos Dados</strong>
Seus dados são o nosso ativo mais importante. Nós os armazenamos em servidores seguros e adotamos as melhores práticas de mercado para protegê-los, incluindo criptografia, controle de acesso restrito e monitoramento constante.

• <strong>Retenção dos Dados:</strong> Manteremos seus dados pessoais enquanto sua conta estiver ativa. Os dados de pedidos e transações financeiras serão mantidos por um período adicional para cumprir com obrigações legais e fiscais (pelo menos 5 anos). Conforme nossos Termos de Serviço, áudios de pedidos antigos podem ser arquivados ou excluídos após um determinado período para otimização da plataforma.

<strong>5. Seus Direitos como Titular de Dados (LGPD)</strong>
A LGPD lhe garante uma série de direitos sobre seus dados pessoais, e nós estamos comprometidos a respeitá-los. Você pode, a qualquer momento, solicitar:

• Confirmação da existência de tratamento dos seus dados.
• Acesso aos seus dados.
• Correção de dados incompletos, inexatos ou desatualizados.
• Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD.
• Portabilidade dos seus dados a outro fornecedor de serviço.
• Eliminação dos dados pessoais tratados com o seu consentimento (sujeito às obrigações legais de retenção).
• Informação sobre as entidades com as quais compartilhamos seus dados.

Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail: <strong>atendimento@pontocomaudio.net</strong>

<strong>6. Uso de Cookies</strong>
Utilizamos cookies essenciais para o funcionamento da Plataforma (ex: manter sua sessão de login) e cookies de análise para entendermos como nossos usuários interagem com o site, o que nos ajuda a melhorar nossos serviços. Para mais detalhes, consulte nossa Política de Cookies (que pode ser uma seção da Política de Privacidade ou um link separado).

<strong>7. Alterações nesta Política de Privacidade</strong>
Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas ou na legislação. Quando o fizermos, alteraremos a data de "Última atualização" no topo deste documento e, em caso de mudanças significativas, notificaremos você através da Plataforma ou por e-mail.

<strong>8. Contato</strong>
Se você tiver qualquer dúvida sobre esta Política de Privacidade ou sobre como seus dados são tratados, por favor, não hesite em nos contatar.

<strong>Encarregado de Proteção de Dados (DPO):</strong> Adelson Ferraz Junior
<strong>E-mail de Contato:</strong> junior@pontocomaudio.net
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
              <div className="max-w-none pr-6">
                <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {processText(activeTab === 'termos' ? termosDeUso : politicaPrivacidade)}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermosPrivacidadePage;