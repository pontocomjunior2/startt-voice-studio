"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// Inicializa o cliente Supabase com a Service Role Key para operações de backend
// que exigem privilégios de administrador.
const supabaseAdmin = (0, supabase_js_1.createClient)(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
exports.supabaseAdmin = supabaseAdmin;
//# sourceMappingURL=supabaseAdmin.js.map