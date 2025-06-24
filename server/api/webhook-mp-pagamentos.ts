import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = express.Router();

// Função para verificar a assinatura do webhook do Mercado Pago
function verifyWebhookSignature(req: Request): boolean {
  try {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    
    if (!xSignature || !xRequestId) {
      console.log('[Webhook MP] Headers de assinatura não encontrados');
      return false;
    }

    const dataID = req.body?.data?.id;
    if (!dataID) {
      console.log('[Webhook MP] Data ID não encontrado no payload');
      return false;
    }

    // Extrair timestamp e hash da assinatura
    const signatureParts = xSignature.split(',');
    let ts, v1;
    
    for (const part of signatureParts) {
      const [key, value] = part.split('=');
      if (key.trim() === 'ts') ts = value;
      if (key.trim() === 'v1') v1 = value;
    }

    if (!ts || !v1) {
      console.log('[Webhook MP] Timestamp ou hash v1 não encontrados na assinatura');
      return false;
    }

    // Construir string de validação
    const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;
    
    // Calcular HMAC
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.log('[Webhook MP] ERRO: MP_WEBHOOK_SECRET não definida');
      return false;
    }

    const cyphedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    // Comparar assinaturas
    return cyphedSignature === v1;
  } catch (error) {
    console.error('[Webhook MP] Erro ao verificar assinatura:', error);
    return false;
  }
}

router.post('/', async (req: Request, res: Response) => {
  console.log('[Webhook MP] Recebido:', req.body);
  console.log('[Webhook MP] Headers:', req.headers);

  try {
    // 1. Verificar assinatura do webhook (comentar durante desenvolvimento se necessário)
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(req)) {
        console.log('[Webhook MP] Assinatura inválida - webhook rejeitado');
        return res.status(400).json({ error: 'Assinatura inválida' });
      }
      console.log('[Webhook MP] Assinatura verificada com sucesso');
    } else {
      console.log('[Webhook MP] Modo desenvolvimento - verificação de assinatura desabilitada');
    }

    // 2. Extrair dados do evento
    const { action, data } = req.body;
    if (!data?.id) {
      console.log('[Webhook MP] Payload recebido sem data.id:', req.body);
      // Sempre retorna 200 para o Mercado Pago considerar o webhook válido
      return res.status(200).json({ received: true, message: 'Payload sem data.id (teste ou ping).' });
    }

    // 3. Verificar se é uma ação relevante
    if (action !== 'payment.created' && action !== 'payment.updated') {
      console.log('[Webhook MP] Ação não processada:', action);
      return res.status(200).json({ received: true, message: 'Ação não processada.' });
    }

    // 4. Buscar detalhes do pagamento no Mercado Pago
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const paymentId = data.id;

    try {
      const mpResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
      );
      const payment = mpResponse.data;

      console.log('[Webhook MP] Detalhes do pagamento:', {
        id: payment.id,
        status: payment.status,
        metadata: payment.metadata
      });

      // 5. Só processa se status for aprovado
      if (payment.status === 'approved') {
        // 6. Extrair metadados que devem conter user_id e pacote_id
        const userId = payment.metadata?.user_id_cliente || payment.metadata?.user_id;
        const pacoteId = payment.metadata?.pacote_id;

        if (!userId || !pacoteId) {
          console.error('[Webhook MP] Metadados essenciais não encontrados:', {
            userId,
            pacoteId,
            metadata: payment.metadata
          });
          return res.status(400).json({ 
            error: 'Webhook Error: Faltando metadados de usuário ou pacote.',
            metadata: payment.metadata
          });
        }

        console.log('[Webhook MP] Processando pagamento aprovado:', {
          userId,
          pacoteId,
          paymentId,
          amount: payment.transaction_amount
        });

        try {
          // 7. Chamar a função RPC restaurada e adaptada
          const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('adicionar_creditos_por_pacote', {
            p_user_id: userId,
            p_pacote_id: pacoteId,
            p_pagamento_id_externo: paymentId.toString(),
            p_metodo_pagamento: payment.payment_method_id || 'mercado_pago'
          });

          if (rpcError) {
            console.error('[Webhook MP] Erro ao chamar RPC do Supabase (adicionar_creditos_por_pacote):', rpcError);
            throw rpcError;
          }

          // A nova função retorna um JSON com status e message
          if (rpcResult && rpcResult.status === 'error') {
            // Logar o erro, mas não retornar 500 para o MP não ficar reenviando
            console.error('[Webhook MP] Erro lógico retornado pela RPC:', rpcResult.message);
            return res.status(200).json({ received: true, message: rpcResult.message });
          }

          console.log('[Webhook MP] RPC executada com sucesso:', rpcResult);
          
          res.status(200).json({ 
            received: true, 
            message: 'Pagamento processado com sucesso',
            paymentId: paymentId,
            userId: userId,
            pacoteId: pacoteId
          });

        } catch (err: any) {
          console.error('[Webhook MP] Erro no processamento da RPC:', err.message);
          res.status(500).json({ 
            received: false, 
            error: `Webhook Error: ${err.message}`,
            paymentId: paymentId
          });
        }
      } else {
        // Se não for aprovado, apenas retorna OK
        console.log('[Webhook MP] Pagamento não aprovado, status:', payment.status);
        return res.status(200).json({ 
          received: true, 
          message: 'Pagamento não aprovado.',
          status: payment.status
        });
      }
    } catch (err: any) {
      // Se for erro 404 (pagamento não existe), apenas loga e retorna OK
      if (err.response && err.response.status === 404) {
        console.log('[Webhook MP] Pagamento não encontrado (provavelmente teste do Mercado Pago):', paymentId);
        return res.status(200).json({ received: true, message: 'Pagamento não encontrado (teste).' });
      }
      // Outros erros, loga e retorna 200 para não bloquear o webhook
      console.error('[Webhook MP] Erro ao buscar pagamento:', err.message);
      return res.status(200).json({ 
        received: true, 
        message: 'Erro ao buscar pagamento.',
        error: err.message
      });
    }
  } catch (err: any) {
    console.error('[Webhook MP] Erro inesperado:', err);
    return res.status(200).json({ 
      received: true, 
      message: 'Erro inesperado.',
      error: err.message
    });
  }
});

export default router;