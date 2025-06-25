"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarAudioIAHandler = void 0;
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
const axios_1 = __importDefault(require("axios"));
// Função auxiliar para simplificar a resposta de erro
const sendError = (res, message, status = 500) => {
    console.error(`[Gerar Audio IA] Erro: ${message}`);
    return res.status(status).json({ success: false, error: message });
};
const gerarAudioIAHandler = async (req, res) => {
    var _a, _b;
    try {
        // 1. Receber e Validar Dados
        const { texto_roteiro, locutor_id, tituloPedido, userId } = req.body;
        if (!texto_roteiro || !locutor_id || !userId) {
            return sendError(res, 'Dados insuficientes: texto_roteiro, locutor_id e userId são obrigatórios.', 400);
        }
        // 2. Verificar Autenticação (simulada, pois a RPC usará o auth.uid() real)
        // No mundo real, um middleware de autenticação faria isso.
        // Buscar o ID da voz do locutor na tabela 'locutores'
        const { data: locutorData, error: locutorError } = await supabaseAdmin_1.supabaseAdmin
            .from('locutores')
            .select('ia_voice_id, ia_disponivel')
            .eq('id', locutor_id)
            .single();
        if (locutorError || !locutorData) {
            return sendError(res, 'Locutor não encontrado ou não configurado para IA.', 404);
        }
        if (!locutorData.ia_disponivel || !locutorData.ia_voice_id) {
            return sendError(res, 'Este locutor não está disponível para geração de áudio por IA.', 403);
        }
        const { ia_voice_id } = locutorData;
        // 3. Criar o Pedido Inicial
        const custoIa = texto_roteiro.length;
        const { data: novoPedido, error: pedidoError } = await supabaseAdmin_1.supabaseAdmin
            .from('pedidos')
            .insert({
            user_id: userId,
            locutor_id: locutor_id,
            texto_roteiro: texto_roteiro,
            titulo: tituloPedido || 'Pedido de Áudio IA',
            status: 'gerando_ia',
            gerado_por_ia: true,
            creditos_ia_debitados: custoIa,
            tipo_audio: 'off_ia', // Novo tipo para diferenciar
        })
            .select('id')
            .single();
        if (pedidoError || !novoPedido) {
            return sendError(res, `Falha ao criar o registro do pedido: ${pedidoError === null || pedidoError === void 0 ? void 0 : pedidoError.message}`);
        }
        const pedidoId = novoPedido.id;
        // 4. Debitar Créditos (Operação Atômica)
        const { data: debitoOk, error: debitoError } = await supabaseAdmin_1.supabaseAdmin.rpc('debitar_creditos_ia', {
            p_user_id: userId,
            p_custo_ia: custoIa,
        });
        if (debitoError || !debitoOk) {
            await supabaseAdmin_1.supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: `Falha no débito de créditos: ${debitoError === null || debitoError === void 0 ? void 0 : debitoError.message}` }).eq('id', pedidoId);
            return sendError(res, `Saldo de Créditos IA insuficiente ou erro no débito: ${debitoError === null || debitoError === void 0 ? void 0 : debitoError.message}`, 402); // 402 Payment Required
        }
        // 5. Chamar a API da ElevenLabs
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            await supabaseAdmin_1.supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: 'Chave de API da ElevenLabs não configurada no servidor.' }).eq('id', pedidoId);
            return sendError(res, 'Configuração do serviço de IA incompleta no servidor.');
        }
        const elevenLabsResponse = await axios_1.default.post(`https://api.elevenlabs.io/v1/text-to-speech/${ia_voice_id}`, { text: texto_roteiro, model_id: 'eleven_multilingual_v2' }, { headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' });
        // 6. Fazer Upload do Áudio Gerado
        const audioBuffer = Buffer.from(elevenLabsResponse.data);
        const filePath = `public/ia_audios/${userId}/${pedidoId}.mp3`;
        const { error: uploadError } = await supabaseAdmin_1.supabaseAdmin.storage
            .from('audios')
            .upload(filePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
        if (uploadError) {
            await supabaseAdmin_1.supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: `Falha no upload para o Supabase Storage: ${uploadError.message}` }).eq('id', pedidoId);
            return sendError(res, `Erro ao salvar o áudio gerado: ${uploadError.message}`);
        }
        const { data: publicUrlData } = supabaseAdmin_1.supabaseAdmin.storage.from('audios').getPublicUrl(filePath);
        const audioFinalUrl = publicUrlData.publicUrl;
        // 7. Finalizar o Pedido
        await supabaseAdmin_1.supabaseAdmin.from('pedidos').update({
            status: 'concluido',
            audio_final_url: audioFinalUrl,
        }).eq('id', pedidoId);
        // 8. Retornar Sucesso
        res.status(200).json({ success: true, message: 'Áudio gerado com sucesso!', audioUrl: audioFinalUrl, pedidoId });
    }
    catch (error) {
        console.error(`[Gerar Audio IA] Erro inesperado:`, error);
        const errorMessage = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) ? JSON.stringify(error.response.data) : error.message;
        // Se o pedido já foi criado, tenta marcar como falho
        const pedidoId = (_b = req.body) === null || _b === void 0 ? void 0 : _b.id;
        if (pedidoId) {
            await supabaseAdmin_1.supabaseAdmin.from('pedidos').update({ status: 'falhou', admin_notes: `Erro inesperado no processo: ${errorMessage}` }).eq('id', pedidoId);
        }
        return sendError(res, `Erro inesperado: ${errorMessage}`);
    }
};
exports.gerarAudioIAHandler = gerarAudioIAHandler;
//# sourceMappingURL=gerar-audio-ia.js.map