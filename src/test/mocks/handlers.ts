import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock da API do Supabase
  http.post('*/auth/v1/token*', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        user_metadata: {
          nome: 'Usuário Teste'
        }
      }
    });
  }),

  // Mock da API do Mercado Pago
  http.post('*/v1/payments', () => {
    return HttpResponse.json({
      id: 'mock-payment-id',
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 100.00,
      payment_method_id: 'pix'
    });
  }),

  http.post('*/v1/card_tokens', () => {
    return HttpResponse.json({
      id: 'mock-card-token',
      status: 'active'
    });
  }),

  // Mock da API ElevenLabs
  http.post('*/v1/text-to-speech/*', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(1024)); // Mock audio data
  }),

  // Mock de queries Supabase
  http.get('*/rest/v1/profiles*', () => {
    return HttpResponse.json([{
      id: 'mock-user-id',
      nome: 'Usuário Teste',
      saldo_gravacao: 100,
      saldo_ia: 50,
      created_at: new Date().toISOString()
    }]);
  }),

  http.get('*/rest/v1/pedidos*', () => {
    return HttpResponse.json([{
      id_pedido: 'mock-pedido-id',
      titulo: 'Pedido de Teste',
      status: 'pendente',
      texto_roteiro: 'Este é um roteiro de teste',
      creditos_debitados: 5,
      created_at: new Date().toISOString()
    }]);
  }),

  http.get('*/rest/v1/pacotes*', () => {
    return HttpResponse.json([{
      id: 'mock-pacote-id',
      nome: 'Pacote Teste',
      valor: 50.00,
      creditos_oferecidos: 100,
      creditos_ia_oferecidos: 50,
      ativo: true,
      listavel: true
    }]);
  })
]; 