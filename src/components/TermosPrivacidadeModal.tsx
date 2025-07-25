import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TermosPrivacidadeModalProps {
  children: React.ReactNode;
}

const TermosPrivacidadeModal: React.FC<TermosPrivacidadeModalProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade'>('termos');
  const [isOpen, setIsOpen] = useState(false);

  const termosDeUso = `<strong>TERMOS DE SERVIÇO DA PLATAFORMA STARTT BY PONTOCOM AUDIO</strong>
<strong>Última atualização: 24 de Julho de 2025</strong>

Bem-vindo à <strong>STARTT by PONTOCOM AUDIO</strong> ("<strong>Plataforma</strong>", "<strong>nós</strong>"). Estes Termos de Serviço ("<strong>Termos</strong>") regem o uso da nossa plataforma digital de produção de áudio e estabelecem os direitos e obrigações entre você ("<strong>Cliente</strong>", "<strong>Usuário</strong>") e a <strong>Adelson Ferraz Junior ME</strong> (nome fantasia <strong>Pontocom Audio</strong>), inscrita no CNPJ/MF sob nº <strong>07.731.566/0001-32</strong>.

Ao se cadastrar ou utilizar a Plataforma, você declara que leu, compreendeu e concorda em estar vinculado a estes Termos. Se você não concordar com qualquer disposição, não deve utilizar nossos serviços.

<strong>1. Descrição dos Serviços</strong>
A <strong>STARTT</strong> é uma plataforma digital inovadora que oferece serviços de produção de áudio sob demanda, incluindo:

• <strong>Locução Profissional:</strong> Produção de áudios com locutores especializados em diversos estilos e segmentos.
• <strong>Gravação com IA:</strong> Tecnologia de inteligência artificial para geração rápida de locuções.
• <strong>Edição e Finalização:</strong> Tratamento profissional do áudio para garantir qualidade broadcast.
• <strong>Entrega Digital:</strong> Sistema automatizado de entrega dos arquivos finalizados.

Todos os serviços são prestados através da nossa plataforma online, onde você pode criar pedidos, acompanhar o progresso e receber os arquivos finalizados.

<strong>2. Cadastro e Conta do Usuário</strong>
• <strong>Informações Precisas:</strong> Ao criar sua conta, você deve fornecer informações verdadeiras, precisas e atualizadas.
• <strong>Responsabilidade pelas Credenciais:</strong> Você é inteiramente responsável por manter a confidencialidade de seu nome de usuário e senha.
• <strong>Uso Autorizado:</strong> Sua conta é pessoal e intransferível. Você deve notificar-nos imediatamente sobre qualquer uso não autorizado.
• <strong>Suspensão de Conta:</strong> Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos ou sejam utilizadas para atividades fraudulentas.

<strong>3. Sistema de Créditos e Pagamentos</strong>
• <strong>Funcionamento:</strong> Nossa plataforma opera com um sistema de créditos pré-pagos. Você adquire pacotes de créditos que são utilizados para fazer pedidos.
• <strong>Preços:</strong> Os valores dos pacotes de créditos e o custo de cada tipo de pedido estão claramente indicados na Plataforma.
• <strong>Métodos de Pagamento:</strong> Aceitamos os principais cartões de crédito e débito através do nosso parceiro de pagamentos <strong>Mercado Pago</strong>.
• <strong>Política de Reembolso:</strong> Créditos adquiridos não são reembolsáveis, exceto em casos de falha técnica comprovada da nossa parte ou conforme previsto na legislação de defesa do consumidor.

<strong>4. Processo de Pedidos e Entrega</strong>
• <strong>Criação de Pedidos:</strong> Você fornece o roteiro (texto), orientações artísticas e seleciona o tipo de serviço desejado.
• <strong>Prazos de Entrega:</strong> Os prazos são informados no momento da criação do pedido e variam conforme o tipo de serviço e complexidade.
• <strong>Qualidade e Revisões:</strong> Cada pedido inclui revisões conforme especificado no tipo de serviço contratado. Revisões adicionais podem ser solicitadas mediante consumo de créditos extras.
• <strong>Entrega:</strong> Os arquivos finalizados são disponibilizados para download diretamente na Plataforma.

<strong>5. Propriedade Intelectual e Direitos Autorais</strong>
• <strong>Conteúdo Produzido:</strong> Após o pagamento integral e entrega do pedido, você adquire os direitos de uso comercial do áudio produzido.
• <strong>Material Fornecido:</strong> Você garante possuir todos os direitos necessários sobre o roteiro e demais materiais fornecidos, isentando-nos de qualquer responsabilidade por violação de direitos de terceiros.
• <strong>Tecnologia e Processos:</strong> Mantemos todos os direitos sobre nossa tecnologia, metodologias, processos e a própria Plataforma.
• <strong>Uso de IA:</strong> Ao utilizar serviços de "Gravação com IA", você reconhece que o áudio é gerado por tecnologia de inteligência artificial.

<strong>6. Responsabilidades do Cliente</strong>
Você se compromete a:
• Fornecer roteiros e orientações claras e completas.
• Garantir que o conteúdo fornecido não viola direitos de terceiros nem contém material ilegal, difamatório ou ofensivo.
• Utilizar os serviços apenas para fins legítimos e em conformidade com a legislação aplicável.
• Manter suas informações de conta atualizadas.
• Respeitar os direitos de propriedade intelectual da Plataforma e de terceiros.

<strong>7. Nossas Responsabilidades</strong>
Nós nos comprometemos a:
• Entregar os serviços conforme especificado e dentro dos prazos informados.
• Manter a confidencialidade dos seus projetos e informações.
• Fornecer suporte técnico adequado através dos canais disponibilizados.
• Garantir a qualidade profissional dos serviços prestados.
• Manter a Plataforma funcionando adequadamente, salvo por manutenções programadas ou circunstâncias fora do nosso controle.

<strong>8. Limitações de Responsabilidade</strong>
• <strong>Limite Financeiro:</strong> Nossa responsabilidade total por qualquer reclamação relacionada aos serviços é limitada ao valor dos créditos utilizados no pedido específico em questão.
• <strong>Danos Indiretos:</strong> Não somos responsáveis por danos indiretos, lucros cessantes, perda de dados ou outras consequências decorrentes do uso da Plataforma.
• <strong>Uso do Material:</strong> Você é inteiramente responsável pelo uso que fizer do material produzido, incluindo sua adequação aos fins pretendidos.

<strong>9. Confidencialidade</strong>
Mantemos absoluto sigilo sobre:
• Todos os roteiros e materiais fornecidos por você.
• Informações sobre seus projetos e estratégias comerciais.
• Dados pessoais e comerciais conforme nossa Política de Privacidade.

Esta obrigação de confidencialidade permanece válida indefinidamente, mesmo após o término da nossa relação comercial.

<strong>10. Cancelamento e Rescisão</strong>
• <strong>Cancelamento de Pedidos:</strong> Pedidos podem ser cancelados antes do início da produção, com reembolso dos créditos utilizados.
• <strong>Suspensão de Conta:</strong> Podemos suspender ou encerrar sua conta em caso de violação destes Termos, atividade fraudulenta ou uso inadequado da Plataforma.
• <strong>Encerramento Voluntário:</strong> Você pode encerrar sua conta a qualquer momento, mas créditos não utilizados não são reembolsáveis.

<strong>11. Modificações dos Termos</strong>
Podemos atualizar estes Termos periodicamente para refletir mudanças em nossos serviços ou na legislação. Quando o fizermos:
• Alteraremos a data de "Última atualização" no topo deste documento.
• Em caso de mudanças significativas, notificaremos você através da Plataforma ou por e-mail.
• O uso continuado da Plataforma após as alterações constitui aceitação dos novos Termos.

<strong>12. Disposições Gerais</strong>
• <strong>Lei Aplicável:</strong> Estes Termos são regidos pela legislação brasileira.
• <strong>Foro:</strong> Eventuais disputas serão resolvidas no foro da comarca de <strong>Vitória/ES</strong>.
• <strong>Integralidade:</strong> Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo integral entre as partes.
• <strong>Divisibilidade:</strong> Se qualquer disposição destes Termos for considerada inválida, as demais permanecem em pleno vigor.

<strong>13. Contato</strong>
Para dúvidas, suporte ou questões relacionadas a estes Termos:

<strong>E-mail de Suporte:</strong> atendimento@pontocomaudio.net
<strong>WhatsApp:</strong> (27) 99710-1531
<strong>Responsável Legal:</strong> Adelson Ferraz Junior

Agradecemos por escolher a <strong>STARTT by PONTOCOM AUDIO</strong> para suas necessidades de produção de áudio!
`;

  const politicaPrivacidade = `<strong>POLÍTICA DE PRIVACIDADE DA PLATAFORMA STARTT</strong>
<strong>Última atualização: 24 de Julho de 2025</strong>

A sua privacidade é de extrema importância para a <strong>STARTT by PONTOCOM AUDIO</strong> ("<strong>Plataforma</strong>", "<strong>nós</strong>"). Esta Política de Privacidade tem como objetivo informar você ("<strong>Cliente</strong>", "<strong>Usuário</strong>" ou "<strong>Titular</strong>") sobre quais dados pessoais coletamos, como os utilizamos, com quem os compartilhamos e como os protegemos, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) do Brasil.

Ao se cadastrar ou utilizar a Plataforma, você declara que leu e concorda com os termos desta Política.

<strong>1. A Empresa Controladora dos Dados</strong>
A empresa responsável pelo tratamento dos seus dados pessoais é a Adelson Ferraz Junior ME (nome fantasia Pontocom Audio), inscrita no CNPJ/MF sob nº 07.731.566/0001-32, com sede em [SEU ENDEREÇO COMPLETO AQUI], doravante denominada "<strong>PONTOCOM AUDIO</strong>".

<strong>2. Quais Dados Coletamos e Para Qual Finalidade?</strong>
Coletamos seus dados pessoais estritamente para viabilizar o funcionamento da Plataforma e a prestação dos nossos serviços. A coleta ocorre nos seguintes contextos:

<strong>a) Dados de Cadastro e Conta:</strong>
• <strong>Quais dados:</strong> Nome completo ou Razão Social, CPF ou CNPJ, e-mail, nome de usuário, senha (criptografada), nome da empresa e número de WhatsApp.
• <strong>Finalidade:</strong> Criar e gerenciar sua conta, processar faturamento e pagamentos, verificar sua identidade, fornecer suporte ao cliente e enviar comunicações essenciais sobre seus pedidos e sua conta.

<strong>b) Dados para a Prestação dos Serviços (Pedidos):</strong>
• <strong>Quais dados:</strong> Textos (roteiros), orientações artísticas, títulos de projetos e, opcionalmente, arquivos de áudio guia que você nos envia.
• <strong>Finalidade:</strong> Executar o serviço principal da Plataforma, ou seja, produzir o áudio de locução conforme suas especificações. Estes dados são a matéria-prima do serviço contratado.

<strong>c) Dados de Pagamento:</strong>
• <strong>Quais dados:</strong> Informações sobre os pacotes de créditos adquiridos, histórico de transações e status de pagamento. <strong>Importante:</strong> Nós não armazenamos os dados completos do seu cartão de crédito. O processamento é feito por nosso parceiro de pagamentos (Mercado Pago), que segue os mais altos padrões de segurança.
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

Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail: atendimento@pontocomaudio.net

<strong>6. Uso de Cookies</strong>
Utilizamos cookies essenciais para o funcionamento da Plataforma (ex: manter sua sessão de login) e cookies de análise para entendermos como nossos usuários interagem com o site, o que nos ajuda a melhorar nossos serviços. Para mais detalhes, consulte nossa Política de Cookies (que pode ser uma seção da Política de Privacidade ou um link separado).

<strong>7. Alterações nesta Política de Privacidade</strong>
Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas ou na legislação. Quando o fizermos, alteraremos a data de "Última atualização" no topo deste documento e, em caso de mudanças significativas, notificaremos você através da Plataforma ou por e-mail.

<strong>8. Contato</strong>
Se você tiver qualquer dúvida sobre esta Política de Privacidade ou sobre como seus dados são tratados, por favor, não hesite em nos contatar.

<strong>Encarregado de Proteção de Dados (DPO):</strong> Adelson Ferraz Junior
<strong>E-mail de Contato:</strong> [junior@pontocomaudio.net]
`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Termos e Política de Privacidade</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Botões de navegação */}
          <div className="flex gap-2 px-6 pb-4 flex-shrink-0">
            <Button
              variant={activeTab === 'termos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('termos')}
              className={cn(
                "flex items-center gap-2",
                activeTab === 'termos' && "bg-gradient-to-r from-startt-blue to-startt-purple text-white"
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
                "flex items-center gap-2",
                activeTab === 'privacidade' && "bg-gradient-to-r from-startt-blue to-startt-purple text-white"
              )}
            >
              <Shield className="h-4 w-4" />
              Política de Privacidade
            </Button>
          </div>
          
          <Separator className="mx-6 flex-shrink-0" />
          
          {/* Conteúdo */}
          <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full">
              <div className="prose prose-sm max-w-none dark:prose-invert pr-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {activeTab === 'termos' ? termosDeUso : politicaPrivacidade}
                </pre>
              </div>
            </ScrollArea>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermosPrivacidadeModal;