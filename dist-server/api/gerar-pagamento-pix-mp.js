"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
function isValidHttpUrl(url) {
    if (!url)
        return false;
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    }
    catch (_a) {
        return false;
    }
}
router.post('/api/criar-pagamento-pix-mp', async (req, res) => {
    var _a, _b, _c;
    try {
        const { pacoteNome, valorTotal, emailCliente, userIdCliente } = req.body;
        if (!pacoteNome || !valorTotal || !emailCliente || !userIdCliente) {
            return res.status(400).json({ success: false, message: 'Dados obrigatórios ausentes.' });
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
        };
        const response = await axios_1.default.post('https://api.mercadopago.com/v1/payments', body, {
            headers: {
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                'X-Idempotency-Key': externalReference,
            }
        });
        const payment = response.data;
        console.log('[MercadoPago] payment response:', JSON.stringify(payment, null, 2));
        const txData = ((_a = payment.point_of_interaction) === null || _a === void 0 ? void 0 : _a.transaction_data) || {};
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
        const tempoExpiracaoSegundos = Math.floor((new Date(payment.date_of_expiration).getTime() - Date.now()) / 1000);
        return res.json({
            success: true,
            paymentId: payment.id,
            qrCodeBase64: txData.qr_code_base64,
            qrCodePayload: txData.qr_code,
            tempoExpiracaoSegundos,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message || 'Erro ao criar pagamento Pix no Mercado Pago',
        });
    }
});
exports.default = router;
//# sourceMappingURL=gerar-pagamento-pix-mp.js.map