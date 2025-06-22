import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '../lib/supabaseAdmin'; // Usaremos o admin para registrar a transação

// Inicializa o cliente do Mercado Pago com o Access Token
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
const payment = new Payment(client);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { token, valorTotal, descricao, installments, paymentMethodId, payer, userIdCliente, pacoteId } = req.body;

  if (!token || !valorTotal || !installments || !paymentMethodId || !payer || !userIdCliente || !pacoteId) {
    return res.status(400).json({ success: false, message: 'Dados de pagamento incompletos.' });
  }

  try {
    const payment_data = {
      transaction_amount: Number(valorTotal),
      token: token,
      description: descricao,
      installments: Number(installments),
      payment_method_id: paymentMethodId,
      payer: {
        email: payer.email,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number,
        },
      },
      metadata: {
        user_id_cliente: userIdCliente,
        pacote_id: pacoteId,
      },
      notification_url: `${process.env.API_URL}/api/webhook-mp-pagamentos`
    };

    console.log("Enviando para o Mercado Pago:", payment_data);
    const result = await payment.create({ body: payment_data });
    console.log("Resposta do Mercado Pago:", result);

    if (result.id && (result.status === 'approved' || result.status === 'in_process')) {
        // Se aprovado, já podemos tentar adicionar os créditos via RPC
        // O webhook servirá como uma garantia final
        if (result.status === 'approved') {
            const { error: rpcError } = await supabaseAdmin.rpc('adicionar_creditos_por_pacote', {
              p_user_id: userIdCliente,
              p_pacote_id: pacoteId,
              p_pagamento_id_externo: result.id.toString(),
              p_metodo_pagamento: 'credit_card'
            });

            if (rpcError) {
              console.error("Erro ao chamar RPC para adicionar créditos (cartão):", rpcError);
              // Não falha a transação, pois o webhook pode corrigir, mas loga o erro.
            }
        }

        res.status(200).json({
          success: true,
          message: 'Pagamento processado com sucesso!',
          status: result.status,
          paymentId: result.id
        });
    } else {
        throw new Error(result.status_detail || 'O pagamento não pôde ser processado.');
    }

  } catch (error: any) {
    console.error('Erro ao processar pagamento com cartão:', error);
    const errorMessage = error.cause?.error?.message || error.message || 'Erro desconhecido.';
    res.status(500).json({ success: false, message: errorMessage });
  }
} 