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
        // PRIORIZAR: Se temos dados do cartão (formulário manual), processar pagamento
        if (card_data && card_data.number) {
            console.log("🔧 [FLUXO MANUAL] Processando pagamento manual com dados do cartão");
            // Buscar informações do pacote
            const { data: pacote, error: pacoteError } = await supabaseAdmin_1.supabaseAdmin
                .from('pacotes')
                .select('creditos_oferecidos, nome')
                .eq('id', pacoteId)
                .single();
            if (pacoteError || !pacote) {
                console.error("❌ [FLUXO MANUAL] Pacote não encontrado:", pacoteError);
                throw new Error('Pacote não encontrado.');
            }
            console.log("📦 [FLUXO MANUAL] Pacote encontrado:", pacote);
            // ✅ Detectar automaticamente payment_method_id e issuer_id
            const detectedPaymentMethod = detectPaymentMethod(card_data.number);
            const issuerId = getIssuerId(detectedPaymentMethod);
            console.log("🔄 [MERCADO PAGO API] Processamento com configuração corrigida:", {
                paymentMethod: detectedPaymentMethod,
                issuerId: issuerId
            });
            // Preparar dados do pagamento CORRIGIDOS para a API do Mercado Pago
            const payment_data = {
                transaction_amount: Number(valorTotal),
                payment_method_id: detectedPaymentMethod,
                issuer_id: issuerId, // ✅ CAMPO OBRIGATÓRIO ADICIONADO
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
                    expiration_year: `20${card_data.expiry_date.split('/')[1]}`, // ✅ ANO COMPLETO
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
                // ✅ CAMPOS ADICIONAIS PARA MELHOR COMPATIBILIDADE
                binary_mode: false,
                capture: true
            };
            console.log("📤 [MERCADO PAGO API] Enviando dados corrigidos:", {
                transaction_amount: payment_data.transaction_amount,
                payment_method_id: payment_data.payment_method_id,
                issuer_id: payment_data.issuer_id,
                installments: payment_data.installments,
                card: {
                    number: payment_data.card.number.slice(0, 4) + '****',
                    expiration_month: payment_data.card.expiration_month,
                    expiration_year: payment_data.card.expiration_year,
                    security_code: '***'
                }
            });
            // Chamar API real do Mercado Pago
            const mpResult = await payment.create({
                body: payment_data,
                requestOptions: {
                    idempotencyKey: `${userIdCliente}-${pacoteId}-${Date.now()}` // ✅ CHAVE DE IDEMPOTÊNCIA
                }
            });
            console.log("📨 [MERCADO PAGO API] Resposta recebida:", {
                id: mpResult.id,
                status: mpResult.status,
                status_detail: mpResult.status_detail,
                payment_method_id: mpResult.payment_method_id
            });
            // Verificar se o pagamento foi processado corretamente
            if (!mpResult.id) {
                throw new Error('Erro no processamento: ID do pagamento não retornado pelo Mercado Pago');
            }
            const isApproved = mpResult.status === 'approved';
            if (isApproved) {
                console.log("✅ [MERCADO PAGO API] Pagamento aprovado! ID:", mpResult.id);
                // Usar a RPC para criar entrada em lotes_creditos com validade
                console.log(`🔧 [MERCADO PAGO API] Chamando RPC adicionar_creditos_por_pacote`);
                try {
                    const { data: rpcResult, error: rpcError } = await supabaseAdmin_1.supabaseAdmin.rpc('adicionar_creditos_por_pacote', {
                        p_user_id: userIdCliente,
                        p_pacote_id: pacoteId,
                        p_pagamento_id_externo: mpResult.id.toString(),
                        p_metodo_pagamento: 'credit_card'
                    });
                    if (rpcError) {
                        console.error("❌ [MERCADO PAGO API] Erro na RPC:", rpcError);
                        throw new Error(`Erro ao processar créditos: ${rpcError.message}`);
                    }
                    console.log("✅ [MERCADO PAGO API] RPC executada com sucesso:", rpcResult);
                }
                catch (rpcErr) {
                    console.error("❌ [MERCADO PAGO API] Erro na RPC:", rpcErr);
                    throw new Error(`Erro ao processar créditos: ${rpcErr.message}`);
                }
                console.log(`🎉 [MERCADO PAGO API] Pagamento CONCLUÍDO! Usuário ${userIdCliente} recebeu ${pacote.creditos_oferecidos} créditos via RPC.`);
                return res.status(200).json({
                    success: true,
                    message: 'Pagamento processado com sucesso!',
                    status: mpResult.status,
                    status_detail: mpResult.status_detail,
                    paymentId: mpResult.id,
                    creditsAdded: pacote.creditos_oferecidos
                });
            }
            else {
                // Pagamento rejeitado pelo Mercado Pago
                const errorMessage = mpResult.status_detail || 'Pagamento recusado. Verifique os dados do cartão e tente novamente.';
                console.log(`❌ [MERCADO PAGO API] Pagamento rejeitado: ${mpResult.status} - ${errorMessage}`);
                return res.status(400).json({
                    success: false,
                    message: errorMessage,
                    status: mpResult.status,
                    status_detail: mpResult.status_detail,
                    paymentId: mpResult.id
                });
            }
        }
        // Fluxo original com token do MP (para compatibilidade futura - apenas se NÃO houver card_data)
        if (token && !card_data) {
            console.log("🔄 [FLUXO MP] Processando via Mercado Pago...");
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
            console.log("Enviando para o Mercado Pago:", payment_data);
            const result = await payment.create({ body: payment_data });
            console.log("Resposta do Mercado Pago:", result);
            if (result.id && (result.status === 'approved' || result.status === 'in_process')) {
                if (result.status === 'approved') {
                    // Aqui seria implementada a mesma lógica de adição de créditos
                    // Por enquanto, retorna sucesso
                }
                return res.status(200).json({
                    success: true,
                    message: 'Pagamento processado com sucesso!',
                    status: result.status,
                    paymentId: result.id
                });
            }
            else {
                throw new Error(result.status_detail || 'O pagamento não pôde ser processado.');
            }
        }
        console.error("❌ Nenhum fluxo de pagamento válido encontrado");
        throw new Error('Dados de pagamento inválidos.');
    }
    catch (error) {
        console.error('💥 [ERRO] Erro ao processar pagamento com cartão:', error);
        // ✅ TRATAMENTO ESPECÍFICO PARA ERROS DE POLÍTICA
        if (error.message && error.message.includes('unauthorized')) {
            const errorMessage = 'Erro de autorização. Verifique as credenciais do Mercado Pago.';
            return res.status(401).json({ success: false, message: errorMessage });
        }
        const errorMessage = ((_j = (_h = error.cause) === null || _h === void 0 ? void 0 : _h.error) === null || _j === void 0 ? void 0 : _j.message) || error.message || 'Erro desconhecido.';
        res.status(500).json({ success: false, message: errorMessage });
    }
}
//# sourceMappingURL=processar-pagamento-cartao-mp.js.map