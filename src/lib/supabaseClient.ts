import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("ERRO CRÍTICO: VITE_SUPABASE_URL não está definida nas variáveis de ambiente.");
  throw new Error("VITE_SUPABASE_URL não está definida nas variáveis de ambiente.");
}

if (!supabaseAnonKey) {
  console.error("ERRO CRÍTICO: VITE_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente.");
  throw new Error("VITE_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente.");
}

console.log("Inicializando cliente Supabase com URL:", supabaseUrl.substring(0, 15) + "...");

// Adiciona opções extras para debug
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    fetch: (...args) => {
      console.log("Supabase fazendo requisição para:", args[0]);
      return fetch(...args);
    }
  }
});

// Verificação adicional da inicialização
console.log("Cliente Supabase inicializado com sucesso:", !!supabase); 