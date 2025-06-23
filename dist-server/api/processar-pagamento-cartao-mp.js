"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const mercadopago_1 = require("mercadopago");
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
// Inicializa o cliente do Mercado Pago com o Access Token
const client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new mercadopago_1.Payment(client);
// Função para detectar payment_method_id baseado no número do cartão
function detectPaymentMethod(cardNumber) {
    const firstDigits = cardNumber.replace(/\s/g, '').substring(0, 6);
    const firstDigit = cardNumber.replace(/\s/g, '').substring(0, 1);
    // Visa
    if (firstDigit === '4')
        return 'visa';
    // Mastercard
    if (['51', '52', '53', '54', '55'].some(prefix => firstDigits.startsWith(prefix)) ||
        (parseInt(firstDigits.substring(0, 4)) >= 2221 && parseInt(firstDigits.substring(0, 4)) <= 2720)) {
        return 'master';
    }
    // American Express
    if (['34', '37'].some(prefix => firstDigits.startsWith(prefix)))
        return 'amex';
    // Elo
    if (['4011', '4312', '4389', '4514', '4573', '6277', '6362', '6363'].some(prefix => firstDigits.startsWith(prefix))) {
        return 'elo';
    }
    // Default para Visa se não detectar
    return 'visa';
}
// Função para obter issuer_id baseado no payment_method_id
function getIssuerId(paymentMethodId) {
    const issuers = {
        'visa': 25,
        'master': 3,
        'amex': 303,
        'elo': 1030
    };
    return issuers[paymentMethodId] || 25; // Default para Visa
}
async function handler(req, res) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    const { token, valorTotal, descricao, installments, paymentMethodId, payer, userIdCliente, pacoteId, card_data } = req.body;
    console.log('🔍 [DEBUG] Dados recebidos no backend:', {
        token: token ? 'PRESENTE' : 'AUSENTE',
        valorTotal,
        descricao,
        installments,
        paymentMethodId,
        payer: payer ? 'PRESENTE' : 'AUSENTE',
        userIdCliente,
        pacoteId,
        card_data: card_data ? 'PRESENTE' : 'AUSENTE',
        ambiente: process.env.NODE_ENV || 'development',
        tokenPrefix: ((_a = process.env.MERCADOPAGO_ACCESS_TOKEN) === null || _a === void 0 ? void 0 : _a.substring(0, 10)) + '...'
    });
    if (!valorTotal || !installments || !payer || !userIdCliente || !pacoteId) {
        return res.status(400).json({ success: false, message: 'Dados de pagamento incompletos.' });
    }
    try {
        // FLUXO PRINCIPAL: Processar pagamento via Mercado Pago
        if (card_data && card_data.number) {
            console.log("🔧 [MP OFICIAL] Enviando pagamento para Mercado Pago");
            // Buscar informações do pacote APENAS para metadados
            const { data: pacote, error: pacoteError } = await supabaseAdmin_1.supabaseAdmin
                .from('pacotes')
                .select('creditos_oferecidos, nome')
                .eq('id', pacoteId)
                .single();
            if (pacoteError || !pacote) {
                console.error("❌ [MP OFICIAL] Pacote não encontrado:", pacoteError);
                throw new Error('Pacote não encontrado.');
            }
            console.log("📦 [MP OFICIAL] Pacote encontrado para metadados:", pacote.nome);
            // Detectar automaticamente payment_method_id e issuer_id
            const detectedPaymentMethod = detectPaymentMethod(card_data.number);
            const issuerId = getIssuerId(detectedPaymentMethod);
            console.log("🔄 [MP OFICIAL] Configuração detectada:", {
                paymentMethod: detectedPaymentMethod,
                issuerId: issuerId
            });
            // Preparar dados do pagamento para a API do Mercado Pago
            const payment_data = {
                transaction_amount: Number(valorTotal),
                payment_method_id: detectedPaymentMethod,
                issuer_id: issuerId,
                installments: Number(installments),
                payer: {
                    email: payer.email,
                    identification: {
                        type: ((_b = payer.identification) === null || _b === void 0 ? void 0 : _b.type) || 'CPF',
                        number: ((_c = payer.identification) === null || _c === void 0 ? void 0 : _c.number) || '11111111111',
                    },
                },
                card: {
                    number: card_data.number.replace(/\s/g, ''),
                    expiration_month: card_data.expiry_date.split('/')[0],
                    expiration_year: `20${card_data.expiry_date.split('/')[1]}`,
                    security_code: card_data.security_code,
                    cardholder: {
                        name: card_data.cardholder_name,
                        identification: {
                            type: ((_d = payer.identification) === null || _d === void 0 ? void 0 : _d.type) || 'CPF',
                            number: ((_e = payer.identification) === null || _e === void 0 ? void 0 : _e.number) || '11111111111',
                        }
                    }
                },
                metadata: {
                    user_id_cliente: userIdCliente,
                    pacote_id: pacoteId,
                },
                description: descricao || 'Compra de créditos PontoComAudio',
                notification_url: `${process.env.API_URL}/api/webhook-mp-pagamentos`,
                binary_mode: false,
                capture: true
            };
            console.log("📤 [MP OFICIAL] Enviando para Mercado Pago:", {
                transaction_amount: payment_data.transaction_amount,
                payment_method_id: payment_data.payment_method_id,
                issuer_id: payment_data.issuer_id,
                installments: payment_data.installments,
                cardholder_name: card_data.cardholder_name
            });
            // ✅ ENVIAR PARA MERCADO PAGO - SEM VALIDAÇÃO LOCAL
            const mpResult = await payment.create({
                body: payment_data,
                requestOptions: {
                    idempotencyKey: `${userIdCliente}-${pacoteId}-${Date.now()}`
                }
            });
            console.log("📨 [MP OFICIAL] Resposta do Mercado Pago:", {
                id: mpResult.id,
                status: mpResult.status,
                status_detail: mpResult.status_detail,
                payment_method_id: mpResult.payment_method_id
            });
            // ✅ IMPORTANTE: NÃO ADICIONAR CRÉDITOS AQUI!
            // Os créditos serão adicionados APENAS pelo webhook quando o MP confirmar
            if (mpResult.id) {
                // Retornar resposta baseada apenas no status do Mercado Pago
                if (mpResult.status === 'approved') {
                    console.log("✅ [MP OFICIAL] Pagamento APROVADO pelo MP - Webhook adicionará créditos");
                    return res.status(200).json({
                        success: true,
                        message: 'Pagamento aprovado! Créditos serão adicionados em instantes.',
                        status: mpResult.status,
                        status_detail: mpResult.status_detail,
                        paymentId: mpResult.id,
                        // NÃO retornar creditsAdded - será feito pelo webhook
                    });
                }
                else if (mpResult.status === 'pending' || mpResult.status === 'in_process') {
                    console.log("⏳ [MP OFICIAL] Pagamento PENDENTE - Aguardando confirmação");
                    return res.status(200).json({
                        success: true,
                        message: 'Pagamento em processamento. Aguarde a confirmação.',
                        status: mpResult.status,
                        status_detail: mpResult.status_detail,
                        paymentId: mpResult.id,
                    });
                }
                else {
                    // Pagamento rejeitado
                    console.log(`❌ [MP OFICIAL] Pagamento REJEITADO: ${mpResult.status} - ${mpResult.status_detail}`);
                    return res.status(400).json({
                        success: false,
                        message: mpResult.status_detail || 'Pagamento recusado pelo Mercado Pago.',
                        status: mpResult.status,
                        status_detail: mpResult.status_detail,
                        paymentId: mpResult.id
                    });
                }
            }
            else {
                throw new Error('Erro: Mercado Pago não retornou ID do pagamento');
            }
        }
        // Fluxo com token (para compatibilidade futura)
        if (token && !card_data) {
            console.log("🔄 [TOKEN MP] Processando via token do Mercado Pago...");
            const payment_data = {
                transaction_amount: Number(valorTotal),
                token: token,
                description: descricao || 'Compra de créditos PontoComAudio',
                installments: Number(installments),
                payment_method_id: paymentMethodId || 'visa',
                payer: {
                    email: payer.email,
                    identification: {
                        type: ((_f = payer.identification) === null || _f === void 0 ? void 0 : _f.type) || 'CPF',
                        number: ((_g = payer.identification) === null || _g === void 0 ? void 0 : _g.number) || '11111111111',
                    },
                },
                metadata: {
                    user_id_cliente: userIdCliente,
                    pacote_id: pacoteId,
                },
                notification_url: `${process.env.API_URL}/api/webhook-mp-pagamentos`
            };
            const result = await payment.create({ body: payment_data });
            console.log("📨 [TOKEN MP] Resposta:", {
                id: result.id,
                status: result.status,
                status_detail: result.status_detail
            });
            if (result.id) {
                return res.status(200).json({
                    success: true,
                    message: result.status === 'approved' ?
                        'Pagamento aprovado! Créditos serão adicionados em instantes.' :
                        'Pagamento em processamento.',
                    status: result.status,
                    status_detail: result.status_detail,
                    paymentId: result.id
                });
            }
            else {
                throw new Error(result.status_detail || 'Erro no processamento do pagamento.');
            }
        }
        console.error("❌ Nenhum método de pagamento válido encontrado");
        throw new Error('Dados de pagamento inválidos.');
    }
    catch (error) {
        console.error('💥 [ERRO] Erro no processamento:', error);
        // Tratamento específico para erros de autorização
        if (error.message && error.message.includes('unauthorized')) {
            return res.status(401).json({
                success: false,
                message: 'Erro de autorização nas credenciais do Mercado Pago.'
            });
        }
        const errorMessage = ((_j = (_h = error.cause) === null || _h === void 0 ? void 0 : _h.error) === null || _j === void 0 ? void 0 : _j.message) || error.message || 'Erro no processamento do pagamento.';
        return res.status(500).json({ success: false, message: errorMessage });
    }
}
//# sourceMappingURL=processar-pagamento-cartao-mp.js.map