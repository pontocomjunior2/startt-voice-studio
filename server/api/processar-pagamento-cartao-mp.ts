import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// LOG DE DIAGNÓSTICO 1: Verificar a variável de ambiente
console.log('[MercadoPago Client] Verificando MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'DEFINIDO' : 'NÃO DEFINIDO');

export const processarPagamentoCartaoMP = async (req: any, res: any) => {
  // MOVIDO PARA DENTRO: Garante que a variável de ambiente seja lida no momento da execução.
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[PAGAMENTO CARTAO] ERRO CRÍTICO: MERCADOPAGO_ACCESS_TOKEN não está definido.');
    return res.status(500).json({ success: false, message: 'Configuração do servidor incompleta.', details: 'internal_error' });
  }
  const client = new MercadoPagoConfig({ accessToken });

  try {
    // LOG DE DIAGNÓSTICO 2: Verificar o corpo da requisição
    console.log('[PAGAMENTO CARTAO] Rota acionada. Body recebido:', req.body);
    
    const { 
      token, 
      transaction_amount,
      descricao, 
      installments, 
      payment_method_id,
      issuer_id,
      payer, 
      userIdCliente, 
      pacoteId
    } = req.body;

    // 1. Validação de Entrada - agora o token é obrigatório
    if (!token || !transaction_amount || !installments || !payment_method_id || !payer || !userIdCliente || !pacoteId) {
      return res.status(400).json({ success: false, message: 'Dados da requisição incompletos.' });
    }
    
    // 2. Busca Segura do Pacote
    const { data: pacote, error: pacoteError } = await supabaseAdmin.from('pacotes').select('nome, creditos_oferecidos').eq('id', pacoteId).single();
    if (pacoteError || !pacote) {
      return res.status(404).json({ success: false, message: 'Pacote de créditos não encontrado.' });
    }

    // 3. Construção do Payload - muito mais simples
    const idempotencyKey = `${userIdCliente}-${pacoteId}-${Date.now()}`;
    const paymentData: any = {
      transaction_amount: Number(transaction_amount),
      description: descricao || `Compra de ${pacote.nome}`,
      installments: Number(installments),
      payment_method_id: payment_method_id,
      token: token,
      payer: {
        email: payer.email,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number,
        }
      },
      metadata: {
        user_id: userIdCliente,
        pacote_id: pacoteId,
        pacote_nome: pacote.nome,
        creditos_oferecidos: pacote.creditos_oferecidos
      }
    };
    if (issuer_id) {
      paymentData.issuer_id = issuer_id;
    }

    // 4. Chamada à API
    const payment = new Payment(client);
    const mpResult = await payment.create({ body: paymentData, requestOptions: { idempotencyKey } });
    
    // 5. Processamento da Resposta
    const response = {
      success: mpResult.status === 'approved',
      message: `Pagamento ${mpResult.status}: ${mpResult.status_detail}`,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      payment_id: mpResult.id,
    };
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('💥 [ERRO DETALHADO CAPTURADO]:', error);

    return res.status(500).json({ success: false, message: 'Falha no processamento do pagamento.', details: 'internal_error' });
  }
}; 