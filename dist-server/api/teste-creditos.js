"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    const { userId, creditosParaAdicionar } = req.body;
    if (!userId || !creditosParaAdicionar) {
        return res.status(400).json({ success: false, message: 'userId e creditosParaAdicionar são obrigatórios' });
    }
    try {
        console.log(`🧪 [TESTE] Adicionando ${creditosParaAdicionar} créditos ao usuário ${userId}`);
        // 1. Buscar créditos atuais
        const { data: profile, error: profileError } = await supabaseAdmin_1.supabaseAdmin
            .from('profiles')
            .select('credits, email')
            .eq('id', userId)
            .single();
        if (profileError) {
            console.error("❌ [TESTE] Erro ao buscar usuário:", profileError);
            throw new Error('Usuário não encontrado.');
        }
        const currentCredits = profile.credits || 0;
        const newCredits = currentCredits + parseInt(creditosParaAdicionar);
        console.log(`💰 [TESTE] ${profile.email}: ${currentCredits} + ${creditosParaAdicionar} = ${newCredits}`);
        // 2. Atualizar créditos (SEM tentar inserir em lotes_creditos)
        const { error: updateError } = await supabaseAdmin_1.supabaseAdmin
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', userId);
        if (updateError) {
            console.error("❌ [TESTE] Erro ao atualizar créditos:", updateError);
            throw new Error('Erro ao atualizar créditos.');
        }
        console.log("✅ [TESTE] Créditos atualizados com sucesso!");
        // 3. Verificar se realmente foi atualizado
        const { data: verification, error: verifyError } = await supabaseAdmin_1.supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
        if (verifyError) {
            console.error("❌ [TESTE] Erro na verificação:", verifyError);
        }
        else {
            console.log(`🔍 [TESTE] Verificação: créditos agora são ${verification.credits}`);
        }
        return res.status(200).json({
            success: true,
            message: 'Teste de créditos executado com sucesso!',
            beforeCredits: currentCredits,
            addedCredits: creditosParaAdicionar,
            afterCredits: newCredits,
            verification: (verification === null || verification === void 0 ? void 0 : verification.credits) || 'Erro na verificação'
        });
    }
    catch (error) {
        console.error('💥 [TESTE] Erro:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}
//# sourceMappingURL=teste-creditos.js.map