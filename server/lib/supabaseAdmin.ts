import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

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

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminInstance;
};

// Exportamos uma instância que será criada na primeira chamada.
export const supabaseAdmin = getSupabaseAdminClient(); 