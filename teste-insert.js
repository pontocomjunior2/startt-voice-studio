require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase.from('lotes_creditos').insert({
    user_id: '4c0138f0-94e1-4014-a8b2-380351b76ff8',
    creditos_gravacao_adicionados: 100,
    creditos_gravacao_usados: 0,
    data_validade: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ativo',
    observacao_admin: 'Teste expiração automática',
    admin_id_que_adicionou: null
  }).select().single();
  console.log('data:', data);
  console.log('error:', error);
})(); 