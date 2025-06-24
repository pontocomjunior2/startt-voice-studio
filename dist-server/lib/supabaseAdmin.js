"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
let supabaseAdminInstance = null;
const getSupabaseAdminClient = () => {
    if (supabaseAdminInstance) {
        return supabaseAdminInstance;
    }
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('ERRO CRÍTICO: Variáveis de ambiente Supabase não definidas no servidor.');
        throw new Error('Configuração do servidor Supabase incompleta.');
    }
    supabaseAdminInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
    return supabaseAdminInstance;
};
// Exportamos uma instância que será criada na primeira chamada.
exports.supabaseAdmin = getSupabaseAdminClient();
//# sourceMappingURL=supabaseAdmin.js.map