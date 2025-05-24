"use strict";
// Para configurar o modelo Gemini, adicione no seu .env:
// GEMINI_MODEL=gemini-2.5-flash-preview-05-20
// GEMINI_API_KEY=xxxx
Object.defineProperty(exports, "__esModule", { value: true });
const gerarRoteiroIAHandler = async (req, res) => {
    var _a, _b, _c, _d, _e;
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }
    // LOGAR VARIÁVEIS DE AMBIENTE CRÍTICAS
    console.log('[IA] GEMINI_API_KEY está definida?', !!process.env.GEMINI_API_KEY);
    console.log('[IA] GEMINI_MODEL:', process.env.GEMINI_MODEL);
    const { nomeProjetoIA, objetivoAudioIA, objetivoAudioOutroIA, publicoAlvoIA, produtoTemaIA, beneficioPrincipalIA, pontosChaveIA, estiloLocucaoIA, estiloLocucaoOutroIA, tomMensagemIA, duracaoAlvoIA, duracaoAlvoOutraIA, callToActionIA, evitarIA, destacarIA, referenciasIA, infoAdicionalIA, } = req.body;
    // Validação mínima dos principais campos obrigatórios
    if (!objetivoAudioIA || !publicoAlvoIA || !produtoTemaIA || !beneficioPrincipalIA || !pontosChaveIA || !estiloLocucaoIA || !tomMensagemIA || !duracaoAlvoIA || !callToActionIA) {
        return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' });
    }
    // Montar prompt detalhado para Gemini
    let prompt = `\nVocê é um redator publicitário especialista em áudio. Siga estas instruções OBRIGATÓRIAS:\n\n1. O roteiro deve ser escrito para ser interpretado por UM ÚNICO LOCUTOR.\n2. A resposta deve ser dividida em DUAS SEÇÕES, com estes títulos EXATOS e em CAIXA ALTA:\n---\nROTEIRO PARA LOCUÇÃO:\n[APENAS o texto puro a ser falado pelo locutor. NÃO coloque SFX, trilha, instruções técnicas, marcações de emoção, tom, ritmo, pausas, colchetes, parênteses, nem nada além do texto da fala.]\n---\nORIENTAÇÕES DE PRODUÇÃO E INTERPRETAÇÃO:\n[Aqui sim coloque TODAS as instruções de produção, SFX, trilha, tom, ritmo, pausas, ênfases, sugestões de interpretação, etc.]\n---\nEXEMPLO DE FORMATO CORRETO:\nROTEIRO PARA LOCUÇÃO:\nVenha conhecer a nova loja Startt! Aproveite as ofertas exclusivas. Esperamos por você!\n\nORIENTAÇÕES DE PRODUÇÃO E INTERPRETAÇÃO:\n- Trilha animada, SFX de loja abrindo, tom entusiasmado, ênfase em "ofertas exclusivas".\n\nNÃO coloque instruções de produção, SFX, trilha, tom, ritmo, etc., na SEÇÃO \"ROTEIRO PARA LOCUÇÃO\". Apenas na SEÇÃO \"ORIENTAÇÕES DE PRODUÇÃO E INTERPRETAÇÃO\".\n\nBriefing do cliente:`;
    if (nomeProjetoIA)
        prompt += `\nProjeto/Campanha: ${nomeProjetoIA}`;
    prompt += `\nObjetivo: ${objetivoAudioIA === 'Outro' ? objetivoAudioOutroIA : objetivoAudioIA}`;
    prompt += `\nPúblico-alvo: ${publicoAlvoIA}`;
    prompt += `\nProduto/Serviço/Evento/Tema: ${produtoTemaIA}`;
    if (beneficioPrincipalIA)
        prompt += `\nBenefício principal: ${beneficioPrincipalIA}`;
    if (pontosChaveIA)
        prompt += `\nInformações obrigatórias: ${pontosChaveIA}`;
    if (estiloLocucaoIA)
        prompt += `\nEstilo de locução: ${estiloLocucaoIA === 'Outro' ? estiloLocucaoOutroIA : estiloLocucaoIA}`;
    if (tomMensagemIA)
        prompt += `\nTom da mensagem: ${tomMensagemIA}`;
    if (duracaoAlvoIA)
        prompt += `\nDuração desejada: ${duracaoAlvoIA === 'Outro' ? duracaoAlvoOutraIA : duracaoAlvoIA}`;
    if (callToActionIA)
        prompt += `\nCall to action: ${callToActionIA}`;
    if (evitarIA)
        prompt += `\nEvitar: ${evitarIA}`;
    if (destacarIA)
        prompt += `\nDestacar: ${destacarIA}`;
    if (referenciasIA)
        prompt += `\nReferências: ${referenciasIA}`;
    if (infoAdicionalIA)
        prompt += `\nInformações adicionais: ${infoAdicionalIA}`;
    prompt += `\n\nRoteiro sugerido:`;
    try {
        console.log('[IA] Payload recebido:', req.body);
        console.log('[IA] Prompt enviado:', prompt);
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        if (!geminiApiKey) {
            console.error('[IA] ERRO: GEMINI_API_KEY não está definida!');
            return res.status(500).json({ success: false, error: 'Chave da API Gemini não configurada.' });
        }
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
        });
        console.log('[IA] Status HTTP da resposta Gemini:', geminiRes.status);
        const geminiData = await geminiRes.json();
        console.log('[IA] Corpo completo da resposta Gemini:', JSON.stringify(geminiData, null, 2));
        const resposta = ((_e = (_d = (_c = (_b = (_a = geminiData === null || geminiData === void 0 ? void 0 : geminiData.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
        console.log('[IA] Resposta bruta Gemini:', resposta);
        // Parse robusto das duas seções
        let roteiro = '';
        let orientacoes = '';
        const match = resposta.match(/ROTEIRO PARA LOCUÇÃO:(.*?)(?:\n+|\r+|\s+)*ORIENTAÇÕES DE PRODUÇÃO E INTERPRETAÇÃO:(.*)/is);
        if (match) {
            roteiro = match[1].replace(/^\s+|\s+$/g, '');
            orientacoes = match[2].replace(/^\s+|\s+$/g, '');
        }
        else {
            // fallback: se não encontrar as seções, retorna tudo como roteiro
            roteiro = resposta.trim();
            orientacoes = '';
        }
        console.log('[IA] Roteiro extraído:', roteiro);
        console.log('[IA] Orientações extraídas:', orientacoes);
        if (roteiro) {
            return res.status(200).json({ success: true, roteiro, orientacoes });
        }
        else {
            console.error('[IA] ERRO: Não foi possível extrair o roteiro da resposta da Gemini.');
            return res.status(500).json({ success: false, error: 'Não foi possível gerar o roteiro.' });
        }
    }
    catch (error) {
        console.error('[IA] Erro inesperado:', error);
        return res.status(500).json({ success: false, error: error.message || 'Erro ao chamar a IA.' });
    }
};
exports.default = gerarRoteiroIAHandler;
//# sourceMappingURL=gerar-roteiro-ia.js.map