import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

function isValidHttpUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

router.post('/api/criar-pagamento-pix-mp', async (req: Request, res: Response) => {
  try {
    const { pacoteNome, valorTotal, emailCliente, userIdCliente, pacoteId } = req.body;
    if (!pacoteNome || !valorTotal || !emailCliente || !userIdCliente || !pacoteId) {
      return res.status(400).json({ success: false, message: 'Dados obrigatórios ausentes (pacoteNome, valorTotal, emailCliente, userIdCliente, pacoteId).' });
    }

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL; // Ex: https://suaapp.com/api/webhook-mp-pagamentos

    if (!isValidHttpUrl(NOTIFICATION_URL)) {
      return res.status(400).json({ success: false, message: 'A variável de ambiente MP_NOTIFICATION_URL deve ser uma URL pública e válida (https://...).' });
    }

    const externalReference = `${userIdCliente}_${pacoteNome}_${Date.now()}`;
    // Data de expiração: 30 minutos a partir de agora
    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const body = {
      transaction_amount: valorTotal,
      description: `Compra de créditos STARTT - ${pacoteNome}`,
      payment_method_id: 'pix',
      payer: { email: emailCliente },
      notification_url: NOTIFICATION_URL,
      external_reference: externalReference,
      date_of_expiration: expirationDate,
      metadata: {
        user_id_cliente: userIdCliente,
        pacote_id: pacoteId,
        pacote_nome: pacoteNome
      },
    };

    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      body,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'X-Idempotency-Key': externalReference,
        }
      }
    );

    const payment = response.data;
    console.log('[MercadoPago] payment response:', JSON.stringify(payment, null, 2));
    const txData = payment.point_of_interaction?.transaction_data || {};

    // Checagem: garantir que o Copia e Cola e o QR Code base64 existem
    if (!txData.qr_code || !txData.qr_code_base64) {
      console.error('[MercadoPago] Falha ao obter chave Pix Copia e Cola ou QR Code base64. Resposta completa:', JSON.stringify(payment, null, 2));
      return res.status(500).json({
        success: false,
        message: 'QR Code do Pix gerado, mas a chave Pix Copia e Cola não foi encontrada na resposta do Mercado Pago. Verifique se a conta está habilitada para receber Pix e se o token utilizado é de uma conta válida e ativa.',
        details: payment
      });
    }

    // Calcula tempo de expiração em segundos
    const tempoExpiracaoSegundos = Math.floor(
      (new Date(payment.date_of_expiration).getTime() - Date.now()) / 1000
    );

    return res.json({
      success: true,
      paymentId: payment.id,
      qrCodeBase64: txData.qr_code_base64,
      qrCodePayload: txData.qr_code,
      tempoExpiracaoSegundos,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Erro ao criar pagamento Pix no Mercado Pago',
    });
  }
});

export default router; 