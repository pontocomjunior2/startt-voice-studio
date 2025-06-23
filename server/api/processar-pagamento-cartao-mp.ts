import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Inicializa o cliente do Mercado Pago com o Access Token
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
const payment = new Payment(client);

export const processarPagamentoCartaoMP = async (req: any, res: any) => {
  try {
    console.log('🔍 [DEBUG] Dados recebidos no backend:', {
      token: req.body.token ? 'PRESENTE' : 'AUSENTE',
      valorTotal: req.body.valorTotal,
      descricao: req.body.descricao,
      installments: req.body.installments,
      paymentMethodId: req.body.paymentMethodId,
      payer: req.body.payer ? 'PRESENTE' : 'AUSENTE',
      userIdCliente: req.body.userIdCliente,
      pacoteId: req.body.pacoteId,
      ambiente: 'development',
      tokenPrefix: req.body.token ? req.body.token.substring(0, 10) + '...' : 'N/A'
    });

    const { 
      token, 
      valorTotal, 
      descricao, 
      installments = 1, 
      paymentMethodId = 'visa',
      payer, 
      userIdCliente, 
      pacoteId 
    } = req.body;

    // Validações básicas
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token do cartão é obrigatório' 
      });
    }

    if (!userIdCliente || !pacoteId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID do usuário e pacote são obrigatórios' 
      });
    }

    console.log('🔧 [MP OFICIAL] Enviando pagamento para Mercado Pago');

    // Buscar metadados do pacote
    const { data: pacote } = await supabaseAdmin
      .from('pacotes')
      .select('nome, valor, creditos_oferecidos')
      .eq('id', pacoteId)
      .single();

    if (!pacote) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pacote não encontrado' 
      });
    }

    console.log('📦 [MP OFICIAL] Pacote encontrado para metadados:', pacote.nome);

    // Chave de idempotência para evitar duplicações
    const idempotencyKey = `${userIdCliente}-${pacoteId}-${Date.now()}`;

    // Criar dados do pagamento para o Mercado Pago
    const paymentData = {
      transaction_amount: valorTotal,
      token: token, // ✅ Token oficial criado pelo SDK
      description: descricao,
      installments: installments,
      payment_method_id: paymentMethodId,
      payer: {
        email: payer?.email || 'test@test.com',
        identification: {
          type: payer?.identification?.type || 'CPF',
          number: payer?.identification?.number || '11111111111'
        }
      },
      metadata: {
        user_id: userIdCliente,
        pacote_id: pacoteId,
        pacote_nome: pacote.nome,
        creditos_oferecidos: pacote.creditos_oferecidos,
        source: 'pontocomaudio-frontend'
      }
    };

    console.log('📤 [MP OFICIAL] Enviando para Mercado Pago (método oficial)');

    // Criar o pagamento via API oficial
    const mpResult = await payment.create({ 
      body: paymentData,
      requestOptions: {
        idempotencyKey: idempotencyKey
      }
    });

    console.log('📨 [MP OFICIAL] Resposta do Mercado Pago:', {
      id: mpResult.id,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      payment_method_id: mpResult.payment_method_id,
      transaction_amount: mpResult.transaction_amount
    });

    // ✅ NOVO FLUXO: Apenas retornar status, NÃO adicionar créditos localmente
    const response = {
      success: mpResult.status === 'approved',
      message: mpResult.status === 'approved' 
        ? 'Pagamento aprovado! Créditos serão adicionados via webhook.' 
        : `Pagamento ${mpResult.status}: ${mpResult.status_detail}`,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      payment_id: mpResult.id,
      transaction_amount: mpResult.transaction_amount,
      payment_method_id: mpResult.payment_method_id
    };

    console.log('✅ [MP OFICIAL] Pagamento processado, aguardando webhook para adição de créditos');

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('💥 [ERRO] Erro no processamento:', {
      message: error.message,
      error: error.error || 'Erro desconhecido',
      status: error.status || 500,
      cause: error.cause || []
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
      details: error.cause || error.error || 'Erro no processamento do pagamento'
    });
  }
}; 