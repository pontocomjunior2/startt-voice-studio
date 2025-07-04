require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const userId = '4c0138f0-94e1-4014-a8b2-380351b76ff8';

(async () => {
  // Inserir lote vencido
  const { data: loteVencido, error: errorVencido } = await supabase.from('lotes_creditos').insert({
    user_id: userId,
    creditos_gravacao_adicionados: 100,
    creditos_gravacao_usados: 0,
    data_validade: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ativo',
    observacao_admin: 'Teste expiração automática (vencido)',
    admin_id_que_adicionou: null
  }).select().single();
  if (errorVencido) {
    console.error('Erro ao inserir lote vencido:', errorVencido);
    process.exit(1);
  }
  console.log('Lote vencido inserido:', loteVencido.id);

  // Inserir lote válido
  const { data: loteValido, error: errorValido } = await supabase.from('lotes_creditos').insert({
    user_id: userId,
    creditos_gravacao_adicionados: 200,
    creditos_gravacao_usados: 0,
    data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ativo',
    observacao_admin: 'Teste expiração automática (válido)',
    admin_id_que_adicionou: null
  }).select().single();
  if (errorValido) {
    console.error('Erro ao inserir lote válido:', errorValido);
    process.exit(1);
  }
  console.log('Lote válido inserido:', loteValido.id);

  // Executar função de expiração
  const { data: expiracao, error: errorExp } = await supabase.rpc('expirar_creditos_vencidos');
  if (errorExp) {
    console.error('Erro ao executar expiração:', errorExp);
    process.exit(1);
  }
  console.log('Resultado da expiração:', expiracao);

  // Buscar lotes após expiração
  const { data: loteVencidoFinal } = await supabase.from('lotes_creditos').select('*').eq('id', loteVencido.id).single();
  const { data: loteValidoFinal } = await supabase.from('lotes_creditos').select('*').eq('id', loteValido.id).single();
  console.log('Lote vencido após expiração:', loteVencidoFinal);
  console.log('Lote válido após expiração:', loteValidoFinal);

  // Limpar dados de teste
  await supabase.from('lotes_creditos').delete().eq('id', loteVencido.id);
  await supabase.from('lotes_creditos').delete().eq('id', loteValido.id);
})(); 