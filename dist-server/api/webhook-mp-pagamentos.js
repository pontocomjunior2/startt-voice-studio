"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const supabase_js_1 = require("@supabase/supabase-js");
const router = express_1.default.Router();
// Inicialize o Supabase (ajuste para seu projeto)
const supabase = (0, supabase_js_1.createClient)(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
router.post('/', async (req, res) => {
    console.log('[Webhook MP] Recebido:', req.body);
    try {
        // Mercado Pago envia { action, data: { id }, ... }
        const { action, data } = req.body;
        if (!(data === null || data === void 0 ? void 0 : data.id)) {
            console.log('[Webhook MP] Payload recebido sem data.id:', req.body);
            // Sempre retorna 200 para o Mercado Pago considerar o webhook válido
            return res.status(200).json({ success: true, message: 'Payload sem data.id (teste ou ping).' });
        }
        // Buscar detalhes do pagamento no Mercado Pago
        const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
        const paymentId = data.id;
        try {
            const mpResponse = await axios_1.default.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
            const payment = mpResponse.data;
            // Só processa se status for aprovado
            if (payment.status === 'approved') {
                // Extrair dados relevantes
                const externalReference = payment.external_reference; // Deve ser userId_pacote_nome_timestamp
                const valorPago = payment.transaction_amount;
                // Parse do userId (ajuste conforme seu padrão)
                const userId = externalReference.split('_')[0];
                // Defina a quantidade de créditos conforme o pacote (exemplo: 10 créditos para R$1,99)
                let quantidade = 10;
                if (valorPago === 1.99)
                    quantidade = 10;
                // Adapte para outros pacotes se necessário
                const validade = new Date();
                validade.setDate(validade.getDate() + 30);
                const { error } = await supabase
                    .from('lotes_creditos')
                    .insert({
                    user_id: userId,
                    quantidade_adicionada: quantidade,
                    data_adicao: new Date().toISOString(),
                    data_validade: validade.toISOString(),
                    origem: 'pix_mp',
                    payment_id: paymentId,
                    valor: valorPago,
                });
                if (error) {
                    console.error('[Webhook MP] Erro ao creditar usuário:', error);
                    // Mesmo em caso de erro, retorna 200 para não bloquear o webhook
                    return res.status(200).json({ success: false, message: 'Erro ao creditar usuário.' });
                }
                // Você pode também atualizar o status do pedido, enviar email, etc.
                return res.status(200).json({ success: true });
            }
            // Se não for aprovado, apenas retorna OK
            return res.status(200).json({ success: true, message: 'Pagamento não aprovado.' });
        }
        catch (err) {
            // Se for erro 404 (pagamento não existe), apenas loga e retorna OK
            if (err.response && err.response.status === 404) {
                console.log('[Webhook MP] Pagamento não encontrado (provavelmente teste do Mercado Pago):', paymentId);
                return res.status(200).json({ success: true, message: 'Pagamento não encontrado (teste).' });
            }
            // Outros erros, loga e retorna 200 para não bloquear o webhook
            console.error('[Webhook MP] Erro ao buscar pagamento:', err.message);
            return res.status(200).json({ success: true, message: 'Erro ao buscar pagamento.' });
        }
    }
    catch (err) {
        console.error('[Webhook MP] Erro inesperado:', err);
        return res.status(200).json({ success: true, message: 'Erro inesperado.' });
    }
});
exports.default = router;
//# sourceMappingURL=webhook-mp-pagamentos.js.map