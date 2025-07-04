import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Usar id de usuário real já existente
const userId = '4c0138f0-94e1-4014-a8b2-380351b76ff8';

describe('Expiração automática de créditos (integração real)', () => {
  let loteVencidoId: string;
  let loteValidoId: string;

  beforeAll(async () => {
    // 1. Adicionar lote vencido (30 dias atrás)
    const { data: loteVencido, error: errorVencido } = await supabase.from('lotes_creditos').insert({
      user_id: userId,
      creditos_gravacao_adicionados: 100,
      creditos_gravacao_usados: 0,
      data_validade: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ativo',
      observacao_admin: 'Teste expiração automática',
      admin_id_que_adicionou: null
    }).select().single();
    if (errorVencido) {
      console.error('Erro ao inserir lote vencido:', errorVencido);
    }
    if (!loteVencido) {
      throw new Error('Falha ao inserir lote vencido');
    }
    loteVencidoId = loteVencido.id;

    // 2. Adicionar lote válido (expira no futuro)
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
    }
    if (!loteValido) {
      throw new Error('Falha ao inserir lote válido');
    }
    loteValidoId = loteValido.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await supabase.from('lotes_creditos').delete().eq('id', loteVencidoId);
    await supabase.from('lotes_creditos').delete().eq('id', loteValidoId);
  });

  it('deve expirar apenas os créditos vencidos e manter os válidos', async () => {
    // 3. Executar a função de expiração
    const { data: expiracao, error } = await supabase.rpc('expirar_creditos_vencidos');
    expect(error).toBeNull();
    expect(expiracao.success).toBe(true);
    expect(expiracao.creditos_expirados).toBeGreaterThanOrEqual(100);

    // 4. Validar que o lote vencido foi debitado
    const { data: loteVencido } = await supabase.from('lotes_creditos').select('*').eq('id', loteVencidoId).single();
    expect(loteVencido.creditos_gravacao_usados).toBe(loteVencido.creditos_gravacao_adicionados);

    // 5. Validar que o lote válido permanece ativo
    const { data: loteValido } = await supabase.from('lotes_creditos').select('*').eq('id', loteValidoId).single();
    expect(loteValido.creditos_gravacao_usados).toBe(0);
  });
}); 