import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key para operações de backend
// que exigem privilégios de administrador.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export { supabaseAdmin }; 