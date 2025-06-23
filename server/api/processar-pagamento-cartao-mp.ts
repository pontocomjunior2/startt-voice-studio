import { MercadoPagoConfig, Payment, CardToken } from 'mercadopago';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Inicializa o cliente do Mercado Pago com o Access Token
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
const payment = new Payment(client);
const cardToken = new CardToken(client);

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
      paymentMethodId,
      issuerId,
      payer, 
      userIdCliente, 
      pacoteId,
      card_data 
    } = req.body;

    // Validações básicas
    if (!token && !card_data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token do cartão ou dados do cartão são obrigatórios' 
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
    let paymentData: any = {
      transaction_amount: valorTotal,
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

    if (issuerId) {
      paymentData.issuer_id = issuerId;
      console.log('✅ [MP OFICIAL] Usando issuer_id:', issuerId);
    }

    // Se temos token válido, usar token. Senão, criar token dos dados do cartão
    if (token && !token.startsWith('token_')) {
      // Token oficial do MP
      paymentData.token = token;
      console.log('🔧 [MP] Usando token oficial');
    } else if (card_data) {
      // Criar Card Token com dados do cartão via API MP
      console.log('🔧 [MP] Criando Card Token com dados do cartão');
      
      const [month, year] = card_data.expiry_date.split('/');
      
      const cardTokenData = {
        card_number: card_data.number,
        security_code: card_data.security_code,
        expiration_month: month,
        expiration_year: `20${year}`,
        cardholder: {
          name: card_data.cardholder_name,
          identification: {
            type: payer?.identification?.type || 'CPF',
            number: payer?.identification?.number || '11111111111'
          }
        }
      };

      // Criar o Card Token via API
      const tokenResponse = await cardToken.create({ body: cardTokenData });
      
      if (!tokenResponse.id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Erro ao criar token do cartão' 
        });
      }

      console.log('✅ [MP] Card Token criado:', tokenResponse.id);
      paymentData.token = tokenResponse.id;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido e dados do cartão não fornecidos' 
      });
    }

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