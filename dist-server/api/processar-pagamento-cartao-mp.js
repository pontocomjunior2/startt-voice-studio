"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processarPagamentoCartaoMP = void 0;
const mercadopago_1 = require("mercadopago");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const processarPagamentoCartaoMP = async (req, res) => {
    try {
        const { token, transaction_amount, descricao, installments, payment_method_id, issuer_id, payer, userIdCliente, pacoteId } = req.body;
        // 1. Validação de Entrada - agora o token é obrigatório
        if (!token || !transaction_amount || !installments || !payment_method_id || !payer || !userIdCliente || !pacoteId) {
            return res.status(400).json({ success: false, message: 'Dados da requisição incompletos.' });
        }
        // 2. Busca Segura do Pacote
        const { data: pacote, error: pacoteError } = await supabaseAdmin_1.supabaseAdmin.from('pacotes').select('nome, creditos_oferecidos').eq('id', pacoteId).single();
        if (pacoteError || !pacote) {
            return res.status(404).json({ success: false, message: 'Pacote de créditos não encontrado.' });
        }
        // 3. Construção do Payload - muito mais simples
        const idempotencyKey = `${userIdCliente}-${pacoteId}-${Date.now()}`;
        const paymentData = {
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
        const payment = new mercadopago_1.Payment(client);
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
    }
    catch (error) {
        console.error('💥 [ERRO DETALHADO CAPTURADO]:', error);
        return res.status(500).json({ success: false, message: 'Falha no processamento do pagamento.', details: 'internal_error' });
    }
};
exports.processarPagamentoCartaoMP = processarPagamentoCartaoMP;
//# sourceMappingURL=processar-pagamento-cartao-mp.js.map